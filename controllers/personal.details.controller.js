const personalDetailsHandler = require("../handlers/personal.details.handler");

exports.createPersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    const existingPersonalDetails = await personalDetailsHandler.getByUserId(userId);
    if (existingPersonalDetails) {
      return res.fail("Personal details already exist, please update existing details");
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

exports.getPersonalDetails = async (req, res) => {
  try {
    const result = await personalDetailsHandler.getByUserId(req.user.id);
    return res.success({
      message: "Personal details retrieved",
      data: result,
    });
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

    return res.success({
      message: "Updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("PersonalDetailsController [updatePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.deletePersonalDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await personalDetailsHandler.deleteByUserId(userId);

    return res.success({
      message: "Personal details deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("PersonalDetailsController [deletePersonalDetails] Error:", error);
    return res.serverError(error);
  }
};
