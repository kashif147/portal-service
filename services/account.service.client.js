const axios = require("axios");

const ACCOUNT_SERVICE_URL =
  process.env.ACCOUNT_SERVICE_URL ||
  "http://projectshell-vm.northeurope.cloudapp.azure.com/account-service";

function buildHeaders(req, tenantId) {
  const headers = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId || req?.headers?.["x-tenant-id"] || "",
    "x-internal-request": "true",
  };

  if (req?.headers?.authorization) {
    headers.authorization = req.headers.authorization;
  }

  for (const key of [
    "x-jwt-verified",
    "x-auth-source",
    "x-user-id",
    "x-user-email",
    "x-user-roles",
    "x-user-permissions",
    "x-correlation-id",
  ]) {
    if (req?.headers?.[key]) {
      headers[key] = req.headers[key];
    }
  }

  return headers;
}

function unwrapResponseData(body) {
  return body?.data?.data || body?.data || body;
}

async function requestAccountService(path, tenantId, req = null) {
  const base = ACCOUNT_SERVICE_URL.replace(/\/$/, "");
  const response = await axios.get(
    `${base}${path}`,
    {
      headers: buildHeaders(req, tenantId || ""),
      timeout: 15000,
      validateStatus: (status) => status < 500,
    }
  );

  if (response.status < 200 || response.status >= 300) {
    const message =
      response.data?.error?.message ||
      response.data?.message ||
      `Payment lookup failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return unwrapResponseData(response.data);
}

async function fetchPaymentByIntent(paymentIntentId, tenantId, req = null) {
  const intentId = String(paymentIntentId || "").trim();
  if (!intentId) {
    throw new Error("paymentIntentId is required");
  }

  return requestAccountService(
    `/api/payments/by-stripe/${encodeURIComponent(intentId)}`,
    tenantId,
    req
  );
}

async function fetchLatestApplicationPayment(applicationId, tenantId, req = null) {
  const appId = String(applicationId || "").trim();
  if (!appId) {
    throw new Error("applicationId is required");
  }

  return requestAccountService(
    `/api/payments/applications/${encodeURIComponent(appId)}/latest`,
    tenantId,
    req
  );
}

module.exports = {
  fetchPaymentByIntent,
  fetchLatestApplicationPayment,
};
