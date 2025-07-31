const personalDetailsHandler = require("../handlers/personal.details.handler");

exports.createPersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    const existingPersonalDetails = await personalDetailsHandler.getByUserId(userId);
    if (existingPersonalDetails) {
      return res.success("Personal details already exist, please update existing details");
    }

    const result = await personalDetailsHandler.create({
      ...validatedData,
      userId,
      meta: { createdBy: userId },
    });

    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [createPersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.getPersonalDetailsByUserId = async (req, res) => {
  try {
    const result = await personalDetailsHandler.getByUserId(req.user.id);
    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [getPersonalDetailsByUserId] Error:", error);
    return res.serverError(error);
  }
};

exports.getPersonalDetails = async (req, res) => {
  try {
    const result = await personalDetailsHandler.getByUserId(req.user.id);
    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [getPersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.updatePersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatePayload = {
      ...req.body,
      meta: { updatedBy: userId },
    };

    const result = await personalDetailsHandler.updateByUserId(userId, updatePayload);

    return res.success(result);
  } catch (error) {
    console.error("PersonalDetailsController [updatePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.deletePersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    await personalDetailsHandler.deleteByUserId(userId);

    return res.success("personal details deleted successfully");
  } catch (error) {
    console.error("PersonalDetailsController [deletePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.restorePersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    const result = await personalDetailsHandler.restoreByUserId(userId, {
      ...validatedData,
      meta: { updatedBy: userId },
    });

    return res.success({
      message: "Personal details restored successfully",
      data: result,
    });
  } catch (error) {
    console.error("PersonalDetailsController [restorePersonalDetails] Error:", error);
    if (error.message === "Deleted personal details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};
