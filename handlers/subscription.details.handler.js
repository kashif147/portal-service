const SubscriptionDetails = require("../models/subscription.model");

exports.create = (data) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await SubscriptionDetails.create(data);
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [create] Error:", error);
      reject(error);
    }
  });

exports.getByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await SubscriptionDetails.findOne({ userId });
      resolve(result);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [getByUserId] Error:", error);
      reject(error);
    }
  });

exports.updateByUserId = (userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await SubscriptionDetails.findOneAndUpdate({ userId }, updateData, {
        new: true,
        runValidators: true,
      });
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [updateByUserId] Error:", error);
      reject(error);
    }
  });

exports.deleteByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await SubscriptionDetails.findOneAndUpdate(
        { userId },
        {
          "meta.deleted": true,
          "meta.isActive": false,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );
      if (!record) return reject(new Error("Subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [deleteByUserId] Error:", error);
      reject(error);
    }
  });

exports.findDeletedByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await SubscriptionDetails.findOne({
        userId,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [findDeletedByUserId] Error:", error);
      reject(error);
    }
  });

exports.restoreByUserId = (userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      // Remove meta from updateData to avoid conflicts
      const { meta, ...dataWithoutMeta } = updateData;

      const record = await SubscriptionDetails.findOneAndUpdate(
        { userId, "meta.deleted": true },
        {
          ...dataWithoutMeta,
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true, runValidators: true }
      );
      if (!record) return reject(new Error("Deleted subscription details not found"));
      resolve(record);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [restoreByUserId] Error:", error);
      reject(error);
    }
  });

exports.checkifSoftDeleted = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await SubscriptionDetails.findOne({ userId, "meta.deleted": true });
      resolve(result);
    } catch (error) {
      console.error("SubscriptionDetailsHandler [checkifSoftDeleted] Error:", error);
      reject(error);
    }
  });
