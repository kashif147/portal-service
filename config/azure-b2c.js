require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

module.exports = {
  // Azure B2C Configuration
  tenantName: process.env.B2C_TENANT_NAME || "your_tenant_name_here",
  tenantId: process.env.B2C_TENANT_ID || "your_tenant_id_here",
  clientId: process.env.B2C_CLIENT_ID || "your_b2c_client_id_here",
  clientSecret: process.env.B2C_CLIENT_SECRET || "your_b2c_client_secret_here",
  signinPolicy: process.env.B2C_SIGNIN_POLICY || "B2C_1_signin",
  signupPolicy: process.env.B2C_SIGNUP_POLICY || "B2C_1_signup",
  redirectUri:
    process.env.B2C_REDIRECT_URI || "http://localhost:4001/auth/azure-portal",

  // Constructed URLs (these are used in the controller directly)
  getBaseUrl(policy) {
    return `https://${this.tenantName}.b2clogin.com/${this.tenantName}.onmicrosoft.com/${policy}`;
  },

  // Return URLs
  chatReturnUrl: process.env.CHAT_RETURN_URL || "http://localhost:3000/chat",
  failReturnUrl:
    process.env.FAIL_RETURN_URL || "http://localhost:3000/auth/failed",

  // User Service URL
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3000",

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_here",
  jwtExpiry: process.env.JWT_EXPIRY || "30d",
};
