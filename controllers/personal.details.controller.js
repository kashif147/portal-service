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
    const { userType } = extractUserAndCreatorContext(req);

    let result;
    if (userType === "CRM") {
      const email = req.params.email || req.query.email;
      if (!email) {
        return res.fail("Email parameter is required for CRM operations");
      }
      result = await personalDetailsHandler.getByEmail(email);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      result = await personalDetailsHandler.getByUserId(userId);
    }

    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [getPersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.updatePersonalDetails = async (req, res) => {
  try {
    const { userType, creatorId } = extractUserAndCreatorContext(req);

    const validatedData = await joischemas.personal_details_update.validateAsync(req.body);

    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    let result;
    if (userType === "CRM") {
      const email = req.params.email || req.query.email;
      if (!email) {
        return res.fail("Email parameter is required for CRM operations");
      }
      result = await personalDetailsHandler.updateByEmail(email, updatePayload);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      result = await personalDetailsHandler.updateByUserId(userId, updatePayload);
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
    const { userType } = extractUserAndCreatorContext(req);

    if (userType === "CRM") {
      const email = req.params.email || req.query.email;
      if (!email) {
        return res.fail("Email parameter is required for CRM operations");
      }
      await personalDetailsHandler.deleteByEmail(email);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      await personalDetailsHandler.deleteByUserId(userId);
    }

    return res.success("personal details deleted successfully");
  } catch (error) {
    console.error("PersonalDetailsController [deletePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};
