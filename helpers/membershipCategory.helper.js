/**
 * membershipCategory is owned by subscription details, but the portal UI still
 * sends it on professional-details create/update. These helpers capture it
 * from the raw body and keep subscription + professional reads in sync for
 * portal flows.
 */

function normalizeMembershipCategory(value) {
  if (value == null || value === "") return null;
  return String(value).trim();
}

function extractMembershipCategoryFromRequestBody(body) {
  return normalizeMembershipCategory(body?.professionalDetails?.membershipCategory);
}

function extractLegacyProfessionalFieldsFromSubscriptionBody(body) {
  const sub = body?.subscriptionDetails || {};
  const legacy = {};
  for (const key of LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION) {
    if (!Object.prototype.hasOwnProperty.call(sub, key)) continue;
    legacy[key] = sub[key];
  }
  return Object.keys(legacy).length > 0 ? legacy : null;
}

function attachMembershipCategoryToProfessionalData(data, membershipCategory) {
  if (!membershipCategory) return data;
  const next = { ...data };
  next.professionalDetails = {
    ...(next.professionalDetails || {}),
    membershipCategory,
  };
  return next;
}

const LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION = [
  "previousMembershipNo",
  "joinYouthForum",
  "youthForum",
];

function mergeLegacyProfessionalFieldsFromSubscription(
  professionalDetails = {},
  legacySubscriptionFields = {},
) {
  const merged = { ...professionalDetails };
  const sub = legacySubscriptionFields || {};
  for (const key of LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION) {
    const prof = merged[key];
    if (prof != null && prof !== "") continue;
    const v = sub[key];
    if (v != null && v !== "") {
      merged[key] = v;
    } else if (typeof v === "boolean" && prof == null) {
      merged[key] = v;
    }
  }
  return merged;
}

async function readLegacyProfessionalFieldsFromSubscriptionRecord(
  subscriptionRecord,
) {
  // The record was already loaded through a tenant-scoped query; re-read the
  // raw legacy fields with the same {_id, tenantId} pair. A record without a
  // tenant (pre-backfill) yields no legacy fields rather than an unscoped read.
  if (!subscriptionRecord?._id || !subscriptionRecord?.tenantId) return {};

  const SubscriptionDetails = require("../models/subscription.model");
  const raw = await SubscriptionDetails.collection.findOne(
    { _id: subscriptionRecord._id, tenantId: subscriptionRecord.tenantId },
    {
      projection: {
        "subscriptionDetails.previousMembershipNo": 1,
        "subscriptionDetails.joinYouthForum": 1,
        "subscriptionDetails.youthForum": 1,
      },
    },
  );
  const sub = raw?.subscriptionDetails || {};
  const legacy = {};
  for (const key of LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION) {
    if (sub[key] !== undefined) legacy[key] = sub[key];
  }
  return legacy;
}

function professionalPayloadIncludesMigratedFields(professionalDetails = {}) {
  return LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION.some((key) =>
    Object.prototype.hasOwnProperty.call(professionalDetails, key),
  );
}

async function enrichProfessionalWithSubscriptionMembershipCategory(
  professionalDoc,
  subscriptionDoc,
) {
  if (!professionalDoc) return professionalDoc;

  const plain = professionalDoc.toObject?.() ?? professionalDoc;
  const legacyFields = await readLegacyProfessionalFieldsFromSubscriptionRecord(
    subscriptionDoc,
  );
  const enrichedProfessionalDetails = mergeLegacyProfessionalFieldsFromSubscription(
    plain.professionalDetails || {},
    legacyFields,
  );

  const subscriptionCategory = normalizeMembershipCategory(
    subscriptionDoc?.subscriptionDetails?.membershipCategory,
  );
  const professionalCategory = normalizeMembershipCategory(
    enrichedProfessionalDetails.membershipCategory,
  );
  const membershipCategory = subscriptionCategory || professionalCategory;

  return {
    ...plain,
    professionalDetails: {
      ...enrichedProfessionalDetails,
      ...(membershipCategory ? { membershipCategory } : {}),
    },
  };
}

/**
 * Joi update schemas apply .default() to omitted keys. Only merge subscription
 * fields the client actually sent so we do not wipe stored values.
 */
function pickRequestedSubscriptionDetails(validatedData, rawBody) {
  if (!validatedData?.subscriptionDetails) return validatedData;

  const rawSub = rawBody?.subscriptionDetails || {};
  const requestedKeys = Object.keys(rawSub);
  if (requestedKeys.length === 0) return validatedData;

  const partial = {};
  for (const key of requestedKeys) {
    if (!Object.prototype.hasOwnProperty.call(rawSub, key)) continue;
    if (
      Object.prototype.hasOwnProperty.call(
        validatedData.subscriptionDetails,
        key
      )
    ) {
      partial[key] = validatedData.subscriptionDetails[key];
    }
  }

  return {
    ...validatedData,
    subscriptionDetails: partial,
  };
}

async function syncMembershipCategoryToSubscription({
  tenantId,
  applicationId,
  membershipCategory,
  userId,
  userType,
  subscriptionDetailsHandler,
}) {
  const category = normalizeMembershipCategory(membershipCategory);
  if (!category || !applicationId) return;

  const existing = await subscriptionDetailsHandler.getByApplicationId(
    tenantId,
    applicationId
  );
  if (!existing) return;

  await subscriptionDetailsHandler.updateByApplicationId(tenantId, applicationId, {
    "subscriptionDetails.membershipCategory": category,
    "meta.updatedBy": userId,
    "meta.userType": userType,
  });
}

async function syncLegacyProfessionalFieldsFromSubscriptionBody({
  tenantId,
  applicationId,
  body,
  userId,
  userType,
  professionalDetailsHandler,
  subscriptionDetailsHandler,
}) {
  const legacyFields = extractLegacyProfessionalFieldsFromSubscriptionBody(body);
  if (!legacyFields || !applicationId) return;

  const existing = await professionalDetailsHandler.getByApplicationId(
    tenantId,
    applicationId,
  );
  if (!existing) return;

  const update = {
    "meta.updatedBy": userId,
    "meta.userType": userType,
  };
  for (const [key, value] of Object.entries(legacyFields)) {
    update[`professionalDetails.${key}`] = value;
  }

  await professionalDetailsHandler.updateByApplicationId(
    tenantId,
    applicationId,
    update,
  );
  await subscriptionDetailsHandler.unsetLegacyProfessionalFieldsByApplicationId(
    tenantId,
    applicationId,
  );
}

module.exports = {
  normalizeMembershipCategory,
  extractMembershipCategoryFromRequestBody,
  extractLegacyProfessionalFieldsFromSubscriptionBody,
  syncLegacyProfessionalFieldsFromSubscriptionBody,
  attachMembershipCategoryToProfessionalData,
  LEGACY_PROFESSIONAL_FIELDS_FROM_SUBSCRIPTION,
  mergeLegacyProfessionalFieldsFromSubscription,
  readLegacyProfessionalFieldsFromSubscriptionRecord,
  professionalPayloadIncludesMigratedFields,
  enrichProfessionalWithSubscriptionMembershipCategory,
  pickRequestedSubscriptionDetails,
  syncMembershipCategoryToSubscription,
};
