const personalDetailsHandler = require("../handlers/personal.details.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");

exports.createPersonalDetails = async (req, res) => {
  try {
    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);

    const validatedData = await joischemas.personal_details_create.validateAsync(req.body);

    if (userType === "CRM") {
      const email = req.body.contactInfo?.personalEmail || req.body.contactInfo?.workEmail;
      const existingPersonalDetails = await personalDetailsHandler.getByEmail(email);
      if (existingPersonalDetails) {
        return res.success("Personal details already exist, please update existing details");
      }
    } else {
      const existingPersonalDetails = await personalDetailsHandler.getByUserId(userId);
      if (existingPersonalDetails) {
        return res.success("Personal details already exist, please update existing details");
      }
    }

    const result = await personalDetailsHandler.create({
      ...validatedData,
      userId,
      meta: { createdBy: creatorId, userType },
    });

    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [createPersonalDetails] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    return res.serverError(error);
  }
};

exports.getPersonalDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      const personalDetails = await personalDetailsHandler.getApplicationById(applicationId);
      if (!personalDetails) {
        return res.fail("Personal details not found");
      }
      return res.success(personalDetails);
    } else {
      const personalDetails = await personalDetailsHandler.getByUserIdAndApplicationId(userId, applicationId);
      if (!personalDetails) {
        return res.fail("Personal details not found");
      }
      return res.success(personalDetails);
    }
  } catch (error) {
    console.error("PersonalDetailsController [getPersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.updatePersonalDetails = async (req, res) => {
  try {
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    const validatedData = await joischemas.personal_details_update.validateAsync(req.body);
    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    let result;
    if (userType === "CRM") {
      result = await personalDetailsHandler.updateByApplicationId(applicationId, updatePayload);
    } else {
      result = await personalDetailsHandler.updateByUserIdAndApplicationId(userId, applicationId, updatePayload);
    }

    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [updatePersonalDetails] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    return res.serverError(error);
  }
};

exports.deletePersonalDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      await personalDetailsHandler.deleteByApplicationId(applicationId);
    } else {
      await personalDetailsHandler.deleteByUserIdAndApplicationId(userId, applicationId);
    }

    return res.success("Personal details deleted successfully");
  } catch (error) {
    console.error("PersonalDetailsController [deletePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};
