const SubscriptionDetails = require("../models/subscription.model");
const personalDetails = require("../models/personal.details.model");
const { requireTenantId } = require("../helpers/tenantScope.js");

// Every exported function takes the trusted tenantId as its FIRST argument and
// includes it in every query/update/delete. A missing tenant throws (403) —
// there is no unscoped fallback.

const emailQuery = (email) => ({
  $or: [
    { "contactInfo.personalEmail": email },
    { "contactInfo.workEmail": email },
  ],
});

exports.create = (tenantId, data) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Stamp the trusted tenant last so nothing in `data` can override it.
      const record = await SubscriptionDetails.create({
        ...data,
        tenantId: scopedTenantId,
      });
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [create] Error:", error);
      reject(error);
    }
  });

exports.getByApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        applicationId,
      });
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [getByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateByApplicationId = (tenantId, applicationId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // tenantId is immutable: never let an update payload move a row.
      delete updateData.tenantId;
      const record = await SubscriptionDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [updateByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.unsetLegacyProfessionalFieldsByApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const existing = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        applicationId,
      });
      if (!existing) return resolve(false);

      await SubscriptionDetails.collection.updateOne(
        { _id: existing._id, tenantId: scopedTenantId },
        {
          $unset: {
            "subscriptionDetails.previousMembershipNo": "",
            "subscriptionDetails.joinYouthForum": "",
            "subscriptionDetails.youthForum": "",
          },
        },
      );
      resolve(true);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [unsetLegacyProfessionalFieldsByApplicationId] Error:",
        error,
      );
      reject(error);
    }
  });

exports.deleteByApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await SubscriptionDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        applicationId,
      });
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [deleteByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByUserId = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const result = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId,
        "meta.deleted": { $ne: true },
        "meta.isActive": true,
      }).sort({ updatedAt: -1, createdAt: -1 });
      resolve(result);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [getByUserId] Error:", error);
      reject(error);
    }
  });

exports.getByEmail = (tenantId, email) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // First find personal details by email to get userId
      const personalDetailsRecord = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });

      if (!personalDetailsRecord) {
        resolve(null);
        return;
      }

      // Then find subscription details by userId
      const result = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
      });
      resolve(result);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [getByEmail] Error:", error);
      reject(error);
    }
  });

exports.updateByUserId = (tenantId, userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      delete updateData.tenantId;
      const record = await SubscriptionDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [updateByUserId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateByEmail = (tenantId, email, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      delete updateData.tenantId;
      // First find personal details by email to get userId
      const personalDetailsRecord = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });

      if (!personalDetailsRecord) {
        return reject(new Error("Personal details not found for this email"));
      }

      // Then update subscription details by userId
      const record = await SubscriptionDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId: personalDetailsRecord._id },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [updateByEmail] Error:", error);
      reject(error);
    }
  });

exports.deleteByUserId = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await SubscriptionDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId,
      });
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [deleteByUserId] Error:",
        error
      );
      reject(error);
    }
  });

exports.deleteByEmail = (tenantId, email) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // First find personal details by email to get userId
      const personalDetailsRecord = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });

      if (!personalDetailsRecord) {
        return reject(new Error("Personal details not found for this email"));
      }

      // Then delete subscription details by userId
      const record = await SubscriptionDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
      });
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [deleteByEmail] Error:", error);
      reject(error);
    }
  });

exports.findDeletedByUserId = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const result = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [findDeletedByUserId] Error:",
        error
      );
      reject(error);
    }
  });

exports.findDeletedByEmail = (tenantId, email) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // First find personal details by email to get userId
      const personalDetailsRecord = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });

      if (!personalDetailsRecord) {
        resolve(null);
        return;
      }

      // Then find deleted subscription details by userId
      const result = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [findDeletedByEmail] Error:",
        error
      );
      reject(error);
    }
  });

exports.restoreByUserId = (tenantId, userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Remove meta (and tenantId) from updateData to avoid conflicts
      const { meta, tenantId: _ignoredTenant, ...dataWithoutMeta } = updateData;

      const record = await SubscriptionDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId, "meta.deleted": true },
        {
          ...dataWithoutMeta,
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true, runValidators: true }
      );
      if (!record)
        return reject(new Error("Deleted subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [restoreByUserId] Error:",
        error
      );
      reject(error);
    }
  });

exports.restoreByEmail = (tenantId, email, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // First find personal details by email to get userId
      const personalDetailsRecord = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });

      if (!personalDetailsRecord) {
        return reject(new Error("Personal details not found for this email"));
      }

      // Remove meta (and tenantId) from updateData to avoid conflicts
      const { meta, tenantId: _ignoredTenant, ...dataWithoutMeta } = updateData;

      // Then restore subscription details by userId
      const record = await SubscriptionDetails.findOneAndUpdate(
        {
          tenantId: scopedTenantId,
          userId: personalDetailsRecord._id,
          "meta.deleted": true,
        },
        {
          ...dataWithoutMeta,
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true, runValidators: true }
      );
      if (!record)
        return reject(new Error("Deleted subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [restoreByEmail] Error:",
        error
      );
      reject(error);
    }
  });

exports.checkifSoftDeleted = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const result = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [checkifSoftDeleted] Error:",
        error
      );
      reject(error);
    }
  });

exports.getApplicationById = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Try lowercase first, then uppercase for backward compatibility
      let record = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        applicationId: applicationId,
      });

      if (!record) {
        record = await SubscriptionDetails.findOne({
          tenantId: scopedTenantId,
          ApplicationId: applicationId,
        });
      }

      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [getApplicationById] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByUserIdAndApplicationId = (tenantId, userId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Try lowercase first, then uppercase for backward compatibility
      let record = await SubscriptionDetails.findOne({
        tenantId: scopedTenantId,
        userId: userId,
        applicationId: applicationId,
      });

      if (!record) {
        record = await SubscriptionDetails.findOne({
          tenantId: scopedTenantId,
          userId: userId,
          ApplicationId: applicationId,
        });
      }

      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [getByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateByUserIdAndApplicationId = (
  tenantId,
  userId,
  applicationId,
  updateData
) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      delete updateData.tenantId;
      // Try lowercase first, then uppercase for backward compatibility
      let record = await SubscriptionDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId: userId, applicationId: applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!record) {
        record = await SubscriptionDetails.findOneAndUpdate(
          {
            tenantId: scopedTenantId,
            userId: userId,
            ApplicationId: applicationId,
          },
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );
      }

      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [updateByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.deleteByUserIdAndApplicationId = (tenantId, userId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Try lowercase first, then uppercase for backward compatibility
      let record = await SubscriptionDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId: userId,
        applicationId: applicationId,
      });

      if (!record) {
        record = await SubscriptionDetails.findOneAndDelete({
          tenantId: scopedTenantId,
          userId: userId,
          ApplicationId: applicationId,
        });
      }

      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "SubscriptionDetailsHandler [deleteByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });
