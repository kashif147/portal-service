const PersonalDetails = require("../models/personal.details.model");

const generateFullAddress = (contactInfo) => {
  if (!contactInfo) return "";
  
  const parts = [];
  
  if (contactInfo.buildingOrHouse?.trim()) {
    parts.push(contactInfo.buildingOrHouse.trim());
  }
  
  if (contactInfo.streetOrRoad?.trim()) {
    parts.push(contactInfo.streetOrRoad.trim());
  }
  
  if (contactInfo.areaOrTown?.trim()) {
    parts.push(contactInfo.areaOrTown.trim());
  }
  
  if (contactInfo.countyCityOrPostCode?.trim()) {
    parts.push(contactInfo.countyCityOrPostCode.trim());
  }
  
  if (contactInfo.country?.trim()) {
    parts.push(contactInfo.country.trim());
  }
  
  return parts.join(", ");
};

exports.create = (data) =>
  new Promise(async (resolve, reject) => {
    try {
      // Age calculation and date conversion
      if (data.personalInfo?.dateOfBirth) {
        let dob;

        // If it's already a Date object (from Joi.date().iso())
        if (data.personalInfo.dateOfBirth instanceof Date) {
          dob = data.personalInfo.dateOfBirth;
        } else {
          // If it's a string, check format
          const dateStr = data.personalInfo.dateOfBirth.toString();
          if (dateStr.includes("/")) {
            dob = new Date(dateStr.split("/").reverse().join("-"));
          } else {
            // ISO format
            dob = new Date(dateStr);
          }
        }

        data.personalInfo.dateOfBirth = dob;
        data.personalInfo.age = new Date().getFullYear() - dob.getFullYear();
      }

      // Convert deceasedDate if present
      if (data.personalInfo?.deceasedDate) {
        let deceasedDate;

        // If it's already a Date object (from Joi.date().iso())
        if (data.personalInfo.deceasedDate instanceof Date) {
          deceasedDate = data.personalInfo.deceasedDate;
        } else {
          // If it's a string, check format
          const dateStr = data.personalInfo.deceasedDate.toString();
          if (dateStr.includes("/")) {
            deceasedDate = new Date(dateStr.split("/").reverse().join("-"));
          } else {
            // ISO format
            deceasedDate = new Date(dateStr);
          }
        }

        data.personalInfo.deceasedDate = deceasedDate;
      }

      // Address formatting
      if (data.contactInfo) {
        data.contactInfo.fullAddress = generateFullAddress(data.contactInfo);
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
      const mongoose = require("mongoose");
      
      // Convert userId to ObjectId if it's a string
      const userIdQuery = typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      console.log("[getByUserId] Querying with userId:", userId, "converted to:", userIdQuery);

      const result = await PersonalDetails.findOne({ 
        userId: userIdQuery,
        "meta.deleted": { $ne: true }
      });

      console.log("[getByUserId] Query result:", result ? "Found" : "Not found");
      
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
        $or: [
          { "contactInfo.personalEmail": email },
          { "contactInfo.workEmail": email },
        ],
      });
      resolve(result);
    } catch (error) {
      console.error("PersonalDetailsHandler [getByEmail] Error:", error);
      reject(error);
    }
  });

exports.getApplicationById = (applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOne({
        applicationId: applicationId,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [getApplicationById] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByUserIdAndApplicationId = (userId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOne({
        userId: userId,
        applicationId: applicationId,
      });
      resolve(result);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [getByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateByApplicationId = (applicationId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      if (updateData.contactInfo) {
        updateData.contactInfo.fullAddress = generateFullAddress(updateData.contactInfo);
      }
      
      const record = await PersonalDetails.findOneAndUpdate(
        { applicationId: applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [updateByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateByUserIdAndApplicationId = (userId, applicationId, updateData) =>
  new Promise(async (resolve, reject) => {
    try {
      if (updateData.contactInfo) {
        updateData.contactInfo.fullAddress = generateFullAddress(updateData.contactInfo);
      }
      
      const record = await PersonalDetails.findOneAndUpdate(
        { userId: userId, applicationId: applicationId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [updateByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.deleteByApplicationId = (applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndDelete({
        applicationId: applicationId,
      });
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [deleteByApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.deleteByUserIdAndApplicationId = (userId, applicationId) =>
  new Promise(async (resolve, reject) => {
    try {
      const record = await PersonalDetails.findOneAndDelete({
        userId: userId,
        applicationId: applicationId,
      });
      if (!record) return reject(new Error("Personal details not found"));
      resolve(record);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [deleteByUserIdAndApplicationId] Error:",
        error
      );
      reject(error);
    }
  });

exports.updateApplicationStatus = (applicationId, status) =>
  new Promise(async (resolve, reject) => {
    try {
      const result = await PersonalDetails.findOneAndUpdate(
        { applicationId: applicationId },
        { applicationStatus: status },
        { new: true }
      );
      resolve(result);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [updateApplicationStatus] Error:",
        error
      );
      reject(error);
    }
  });

exports.getByUserIdForPortal = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const mongoose = require("mongoose");
      
      // Convert userId to ObjectId if it's a string
      const userIdQuery = typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      console.log("[getByUserIdForPortal] Querying with userId:", userId, "converted to:", userIdQuery);

      const result = await PersonalDetails.findOne({
        userId: userIdQuery,
        "meta.userType": "PORTAL",
        "meta.deleted": { $ne: true },
        "meta.isActive": true,
      }).sort({ updatedAt: -1, createdAt: -1 });

      console.log("[getByUserIdForPortal] Query result:", result ? "Found" : "Not found");
      
      resolve(result);
    } catch (error) {
      console.error(
        "PersonalDetailsHandler [getByUserIdForPortal] Error:",
        error
      );
      reject(error);
    }
  });
