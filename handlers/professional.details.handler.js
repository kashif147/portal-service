const ProfessionalDetails = require("../models/professional.details.model");
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
      const record = await ProfessionalDetails.create({
        ...data,
        tenantId: scopedTenantId,
      });
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [create] Error:", error);
      reject(error);
    }
  });

exports.checkApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await personalDetails.findOne({
        tenantId: scopedTenantId,
        applicationId,
      });
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [checkApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        applicationId,
      });
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [getByApplicationId] Error:",
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
      const record = await ProfessionalDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [updateByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.deleteByApplicationId = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await ProfessionalDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        applicationId,
      });
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [deleteByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.checkPersonalDetailsByEmail = (tenantId, email) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await personalDetails.findOne({
        tenantId: scopedTenantId,
        ...emailQuery(email),
      });
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [checkPersonalDetailsByEmail] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByUserId = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const result = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        userId,
        "meta.deleted": { $ne: true },
        "meta.isActive": true,
      }).sort({ updatedAt: -1, createdAt: -1 });
      resolve(result);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [getByUserId] Error:", error);
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

      // Then find professional details by userId
      const result = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
      });
      resolve(result);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [getByEmail] Error:", error);
      reject(error);
    }
  });

exports.updateByUserId = (tenantId, userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      delete updateData.tenantId;
      const record = await ProfessionalDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [updateByUserId] Error:",
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

      // Then update professional details by userId
      const record = await ProfessionalDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId: personalDetailsRecord._id },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [updateByEmail] Error:", error);
      reject(error);
    }
  });

exports.deleteByUserId = (tenantId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      const record = await ProfessionalDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId,
      });
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [deleteByUserId] Error:",
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

      // Then delete professional details by userId
      const record = await ProfessionalDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
      });
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [deleteByEmail] Error:", error);
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

      // Then find deleted professional details by userId
      const result = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        userId: personalDetailsRecord._id,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [findDeletedByEmail] Error:",
        error
      );
      reject(error);
    }
  });

exports.getApplicationById = (tenantId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const scopedTenantId = requireTenantId(tenantId);
      // Query both uppercase and lowercase field names to handle legacy data
      // Prioritize lowercase since schema uses applicationId
      let record = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        applicationId: applicationId,
      });

      // Fallback to uppercase for backward compatibility with legacy data
      if (!record) {
        record = await ProfessionalDetails.findOne({
          tenantId: scopedTenantId,
          ApplicationId: applicationId,
        });
      }

      resolve(record || null);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [getApplicationById] Error:",
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
      let record = await ProfessionalDetails.findOne({
        tenantId: scopedTenantId,
        userId: userId,
        applicationId: applicationId,
      });

      if (!record) {
        record = await ProfessionalDetails.findOne({
          tenantId: scopedTenantId,
          userId: userId,
          ApplicationId: applicationId,
        });
      }

      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [getByUserIdAndApplicationId] Error:",
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
      let record = await ProfessionalDetails.findOneAndUpdate(
        { tenantId: scopedTenantId, userId: userId, applicationId: applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!record) {
        record = await ProfessionalDetails.findOneAndUpdate(
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

      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [updateByUserIdAndApplicationId] Error:",
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
      let record = await ProfessionalDetails.findOneAndDelete({
        tenantId: scopedTenantId,
        userId: userId,
        applicationId: applicationId,
      });

      if (!record) {
        record = await ProfessionalDetails.findOneAndDelete({
          tenantId: scopedTenantId,
          userId: userId,
          ApplicationId: applicationId,
        });
      }

      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "ProfessionalDetailsHandler [deleteByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });
///
