const crypto = require("crypto");
const axios = require("axios");
const { jwtVerify, createRemoteJWKSet } = require("jose");
const azureB2CConfig = require("../config/azure-b2c");

// In-memory PKCE store (in production, use Redis or database)
const pkceStore = new Map();

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pkceStore.entries()) {
    if (data.expiresAt < now) {
      pkceStore.delete(state);
    }
  }
}, 60 * 60 * 1000);

class AuthController {
  // GET /auth/start
  async startAuth(req, res) {
    try {
      const { flow = "signin", conversationId } = req.query;

      // Validate flow parameter
      if (!["signin", "signup"].includes(flow)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid flow parameter. Must be "signin" or "signup"',
            code: "INVALID_FLOW",
          },
        });
      }

      // Generate PKCE parameters
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

      // Generate state and nonce
      const state = crypto.randomUUID();
      const nonce = crypto.randomUUID();

      // Create HMAC for state tamper protection
      const hmac = crypto
        .createHmac("sha256", azureB2CConfig.jwtSecret)
        .update(state)
        .digest("hex");

      // Store PKCE data
      pkceStore.set(state, {
        codeVerifier,
        codeChallenge,
        nonce,
        conversationId,
        hmac,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Choose policy based on flow
      const policy =
        flow === "signin"
          ? azureB2CConfig.signinPolicy
          : azureB2CConfig.signupPolicy;

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: azureB2CConfig.clientId,
        response_type: "code",
        response_mode: "query",
        redirect_uri: azureB2CConfig.redirectUri,
        scope: "openid offline_access profile email",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
        nonce: nonce,
        ui_locales: "en-IE",
      });

      const authorizeUrl = `${azureB2CConfig.getBaseUrl(
        policy
      )}/oauth2/v2.0/authorize?${params.toString()}`;

      res.json({
        success: true,
        data: {
          authorizeUrl,
        },
      });
    } catch (error) {
      console.error("Error in startAuth:", error.message);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate authorization URL",
          code: "AUTH_START_FAILED",
        },
      });
    }
  }

  // GET /auth/azure-portal
  async handleAzureCallback(req, res) {
    const correlationId = crypto.randomUUID();

    try {
      const { code, state } = req.query;

      if (!code || !state) {
        console.error(`[${correlationId}] Missing code or state parameter`);
        return res.redirect(
          `${azureB2CConfig.failReturnUrl}?error=missing_params&correlationId=${correlationId}`
        );
      }

      // Look up PKCE data
      const pkceData = pkceStore.get(state);
      if (!pkceData) {
        console.error(`[${correlationId}] Invalid or expired state`);
        return res.redirect(
          `${azureB2CConfig.failReturnUrl}?error=invalid_state&correlationId=${correlationId}`
        );
      }

      // Verify HMAC
      const expectedHmac = crypto
        .createHmac("sha256", azureB2CConfig.jwtSecret)
        .update(state)
        .digest("hex");

      if (pkceData.hmac !== expectedHmac) {
        console.error(`[${correlationId}] HMAC verification failed`);
        return res.redirect(
          `${azureB2CConfig.failReturnUrl}?error=tamper_detected&correlationId=${correlationId}`
        );
      }

      // Clear state entry
      pkceStore.delete(state);

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(
        code,
        pkceData.codeVerifier,
        pkceData.nonce
      );

      // Validate ID token
      const idTokenPayload = await this.validateIdToken(
        tokenResponse.id_token,
        pkceData.nonce
      );

      // Create internal session via user-service
      const sessionResponse = await this.createInternalSession(
        tokenResponse.id_token
      );

      // Set secure cookie
      res.cookie("sid", sessionResponse.jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Redirect to chat with conversationId if present
      const redirectUrl = pkceData.conversationId
        ? `${azureB2CConfig.chatReturnUrl}?conversationId=${pkceData.conversationId}`
        : azureB2CConfig.chatReturnUrl;

      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error(
        `[${correlationId}] Error in handleAzureCallback:`,
        error.message
      );

      let errorCode = "auth_failed";
      if (error.message.includes("token"))
        errorCode = "token_validation_failed";
      if (error.message.includes("session"))
        errorCode = "session_creation_failed";

      res.redirect(
        `${azureB2CConfig.failReturnUrl}?error=${errorCode}&correlationId=${correlationId}`
      );
    }
  }

  async exchangeCodeForTokens(code, codeVerifier, nonce) {
    const tokenUrl = `${azureB2CConfig.getBaseUrl(
      azureB2CConfig.signinPolicy
    )}/oauth2/v2.0/token`;

    const tokenData = {
      client_id: azureB2CConfig.clientId,
      client_secret: azureB2CConfig.clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: azureB2CConfig.redirectUri,
      code_verifier: codeVerifier,
    };

    try {
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 7000,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Token exchange failed: ${
            error.response.data.error_description || error.response.data.error
          }`
        );
      }
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  async validateIdToken(idToken, expectedNonce) {
    try {
      // Create JWKS client
      const jwksUrl = `${azureB2CConfig.getBaseUrl(
        azureB2CConfig.signinPolicy
      )}/discovery/v2.0/keys`;
      const JWKS = createRemoteJWKSet(new URL(jwksUrl));

      // Verify the token
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: `https://${azureB2CConfig.tenantName}.b2clogin.com/${azureB2CConfig.tenantId}/v2.0/`,
        audience: azureB2CConfig.clientId,
        nonce: expectedNonce,
      });

      // Validate policy (tfp claim)
      if (
        !azureB2CConfig.signinPolicy.includes(payload.tfp) &&
        !azureB2CConfig.signupPolicy.includes(payload.tfp)
      ) {
        throw new Error("Invalid policy in token");
      }

      return payload;
    } catch (error) {
      throw new Error(`ID token validation failed: ${error.message}`);
    }
  }

  async createInternalSession(idToken) {
    try {
      const response = await axios.post(
        `${azureB2CConfig.userServiceUrl}/sessions`,
        {
          id_token: idToken,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 7000,
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Session creation failed: ${
            error.response.data.error?.message || "Unknown error"
          }`
        );
      }
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }
}

module.exports = new AuthController();
