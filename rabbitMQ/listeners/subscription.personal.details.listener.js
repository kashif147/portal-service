const PersonalDetails = require("../../models/personal.details.model.js");
const { getEventTenantId } = require("../../helpers/tenantScope.js");

function normalizeMembershipPayload(payload) {
  const data = payload?.data || payload;
  if (!data || typeof data !== "object") return null;
  return data;
}

async function setPersonalDetailsInactiveFromMembershipEvent(payload, reason) {
  const data = normalizeMembershipPayload(payload);
  if (!data) return;

  const applicationId =
    data.applicationId != null ? String(data.applicationId).trim() : "";

  if (!applicationId) {
    console.warn(
      "[portal.subscription.personal.details] Missing applicationId; skip meta.isActive update",
      { reason, subscriptionId: data.subscriptionId || null, profileId: data.profileId || null }
    );
    return;
  }

  // Envelope tenant (payload.tenantId) is authoritative; data.tenantId mirror.
  const tenantId = getEventTenantId(payload, data);
  if (!tenantId) {
    console.warn(
      "[portal.subscription.personal.details] Missing tenantId (envelope or data); skip meta.isActive update",
      { reason, applicationId }
    );
    return;
  }

  const result = await PersonalDetails.updateOne(
    { tenantId, applicationId },
    { $set: { "meta.isActive": false } }
  );

  if (result.matchedCount === 0) {
    console.warn(
      "[portal.subscription.personal.details] No personalDetails row matched",
      { applicationId, reason }
    );
  }
}

async function setPersonalDetailsActiveFromMembershipEvent(payload, reason) {
  const data = normalizeMembershipPayload(payload);
  if (!data) return;

  const applicationId =
    data.applicationId != null ? String(data.applicationId).trim() : "";

  if (!applicationId) {
    console.warn(
      "[portal.subscription.personal.details] Missing applicationId; skip meta.isActive update",
      { reason, subscriptionId: data.subscriptionId || null, profileId: data.profileId || null }
    );
    return;
  }

  // Envelope tenant (payload.tenantId) is authoritative; data.tenantId mirror.
  const tenantId = getEventTenantId(payload, data);
  if (!tenantId) {
    console.warn(
      "[portal.subscription.personal.details] Missing tenantId (envelope or data); skip meta.isActive update",
      { reason, applicationId }
    );
    return;
  }

  const result = await PersonalDetails.updateOne(
    { tenantId, applicationId },
    { $set: { "meta.isActive": true } }
  );

  if (result.matchedCount === 0) {
    console.warn(
      "[portal.subscription.personal.details] No personalDetails row matched",
      { applicationId, reason }
    );
  }
}

async function handleSubscriptionResignedInactive(payload) {
  await setPersonalDetailsInactiveFromMembershipEvent(payload, "resigned");
}

async function handleSubscriptionCancelledInactive(payload) {
  await setPersonalDetailsInactiveFromMembershipEvent(payload, "cancelled");
}

async function handleSubscriptionResignationUndoneActive(payload) {
  await setPersonalDetailsActiveFromMembershipEvent(payload, "resignation_undone");
}

async function handleSubscriptionCancellationUndoneActive(payload) {
  await setPersonalDetailsActiveFromMembershipEvent(payload, "cancellation_undone");
}

module.exports = {
  handleSubscriptionResignedInactive,
  handleSubscriptionCancelledInactive,
  handleSubscriptionResignationUndoneActive,
  handleSubscriptionCancellationUndoneActive,
};
