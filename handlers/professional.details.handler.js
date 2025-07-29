const ProfessionalDetails = require("../models/professional.details.model");
const personalDetails = require("../models/personal.details.model");
exports.create = (data) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await ProfessionalDetails.create(data);
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [create] Error:", error);
      reject(error);
    }
  });

exports.checkApplicationId = (ApplicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await personalDetails.findOne({ ApplicationId });
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [checkApplicationId] Error:", error);
      reject(error);
    }
  });

exports.getByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await ProfessionalDetails.findOne({ userId });
      resolve(result);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [getByUserId] Error:", error);
      reject(error);
    }
  });

exports.updateByUserId = (userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await ProfessionalDetails.findOneAndUpdate({ userId }, updateData, {
        new: true,
        runValidators: true,
      });
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [updateByUserId] Error:", error);
      reject(error);
    }
  });

exports.deleteByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await ProfessionalDetails.findOneAndUpdate(
        { userId },
        {
          "meta.deleted": true,
          "meta.isActive": false,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );
      if (!record) return reject(new Error("Professional details not found"));
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [deleteByUserId] Error:", error);
      reject(error);
    }
  });

exports.findDeletedByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await ProfessionalDetails.findOne({
        userId,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [findDeletedByUserId] Error:", error);
      reject(error);
    }
  });

exports.restoreByUserId = (userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      // Remove meta from updateData to avoid conflicts
      const { meta, ...dataWithoutMeta } = updateData;

      const record = await ProfessionalDetails.findOneAndUpdate(
        { userId, "meta.deleted": true },
        {
          ...dataWithoutMeta,
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true, runValidators: true }
      );
      if (!record) return reject(new Error("Deleted professional details not found"));
      resolve(record);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [restoreByUserId] Error:", error);
      reject(error);
    }
  });

exports.checkifSoftDeleted = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await ProfessionalDetails.findOne({ userId, "meta.deleted": true });
      resolve(result);
    } catch (error) {
      console.error("ProfessionalDetailsHandler [checkifSoftDeleted] Error:", error);
      reject(error);
    }
  });
