const PersonalDetails = require("../models/personal.details.model");

exports.create = (data) =>
  new Promise(async (resolve, reject) => {
    try {
      // Age calculation
      if (data.personalInfo?.dateOfBirth) {
        const dob = new Date(data.personalInfo.dateOfBirth.split("/").reverse().join("-"));
        data.personalInfo.age = new Date().getFullYear() - dob.getFullYear();
      }

      // Address formatting
      if (data.contactInfo) {
        const fullAddress = [
          data.contactInfo.buildingOrHouse,
          data.contactInfo.streetOrRoad,
          data.contactInfo.areaOrTown,
          data.contactInfo.countyCityOrPostCode,
          data.contactInfo.country,
        ]
          .filter(Boolean)
          .join(", ");
        data.contactInfo.fullAddress = fullAddress;
      }

      const record = await PersonalDetails.create(data);
      resolve(record);
    } catch (error) {
      console.error("PersonalDetailsHandler [create] Error:", error);
      reject(error);
    }
  });

exports.getByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOne({ userId });
      resolve(result);
    } catch (error) {
      console.error("PersonalDetailsHandler [getByUserId] Error:", error);
      reject(error);
    }
  });

exports.getByEmail = (email) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOne({
        $or: [{ "contactInfo.personalEmail": email }, { "contactInfo.workEmail": email }],
      });
      resolve(result);
    } catch (error) {
      console.error("PersonalDetailsHandler [getByEmail] Error:", error);
      reject(error);
    }
  });

exports.updateByUserId = (userId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndUpdate({ userId }, updateData, {
        new: true,
        runValidators: true,
      });
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error("PersonalDetailsHandler [updateByUserId] Error:", error);
      reject(error);
    }
  });

exports.updateByEmail = (email, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndUpdate(
        { $or: [{ "contactInfo.personalEmail": email }, { "contactInfo.workEmail": email }] },
        updateData,
        { new: true, runValidators: true }
      );
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error("PersonalDetailsHandler [updateByEmail] Error:", error);
      reject(error);
    }
  });

exports.deleteByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndDelete({ userId });
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error("PersonalDetailsHandler [deleteByUserId] Error:", error);
      reject(error);
    }
  });

exports.deleteByEmail = (email) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndDelete(
        {
          $or: [{ "contactInfo.personalEmail": email }, { "contactInfo.workEmail": email }],
        },
        { new: true }
      );
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error("PersonalDetailsHandler [deleteByEmail] Error:", error);
      reject(error);
    }
  });

exports.findDeletedByUserId = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOne({
        userId,
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error("PersonalDetailsHandler [findDeletedByUserId] Error:", error);
      reject(error);
    }
  });

exports.findDeletedByEmail = (email) =>
  new Promise(async (resolve, reject) => {
    try {
      // Check both personalEmail and workEmail fields
      const result = await PersonalDetails.findOne({
        $or: [{ "contactInfo.personalEmail": email }, { "contactInfo.workEmail": email }],
        "meta.deleted": true,
      });
      resolve(result);
    } catch (error) {
      console.error("PersonalDetailsHandler [findDeletedByEmail] Error:", error);
      reject(error);
    }
  });
