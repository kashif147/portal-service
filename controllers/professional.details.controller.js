const professionalDetailsHandler = require("../handlers/professional.details.handler");
const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");

// Function to update subscription details with professional details
// const updateSubscriptionWithProfessionalDetails = async (userId, professionalDetails) => {
//   try {
//     // Check if subscription details exist for this user
//     const existingSubscription = await subscriptionDetailsHandler.getByUserId(userId);
//     if (existingSubscription) {
//       // Extract common fields from professional details
//       const commonFields = {
//         membershipCategory: professionalDetails.membershipCategory,
//         workLocation: professionalDetails.workLocation,
//         otherWorkLocation: professionalDetails.otherWorkLocation,
//         region: professionalDetails.region,
//         branch: professionalDetails.branch,
//       };

//       // Update subscription details with professional details
//       await subscriptionDetailsHandler.updateByUserId(userId, {
//         professionalDetails: commonFields,
//       });
//     }
//   } catch (error) {
//     console.error("Error updating subscription with professional details:", error);
//   }
// };

exports.createProfessionalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    try {
      const existingProfessionalDetails = await professionalDetailsHandler.getByUserId(userId);
      if (existingProfessionalDetails) {
        return res.fail("Professional details already exist, please update existing details");
      }
    } catch (error) {
      console.error("ProfessionalDetailsController [createProfessionalDetails] Error:", error);
      return res.serverError(error);
    }
    const applicationId = await professionalDetailsHandler.checkApplicationId(validatedData.ApplicationId);
    if (!applicationId) {
      return res.fail("Application ID not found, please enter a valid application ID");
    }

    // Create new professional details
    const result = await professionalDetailsHandler.create({
      ...validatedData,
      userId,
      meta: { createdBy: userId },
    });

    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [createProfessionalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.getProfessionalDetailsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await professionalDetailsHandler.getByUserId(userId);
    if (!result) {
      return res.fail("Professional details not found");
    }
    if (result.meta && result.meta.deleted) {
      return res.success("Professional details deleted, please restore to continue");
    }
    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [getProfessionalDetailsByUserId] Error:", error);
    return res.serverError(error);
  }
};

exports.getProfessionalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await professionalDetailsHandler.getByUserId(userId);

    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [getProfessionalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.updateProfessionalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatePayload = {
      ...req.body,
      meta: { updatedBy: userId },
    };

    const result = await professionalDetailsHandler.updateByUserId(userId, updatePayload);

    // // Update subscription details with professional details if subscription exists
    // if (result && result.professionalDetails) {
    //   await updateSubscriptionWithProfessionalDetails(userId, result.professionalDetails);
    // }

    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [updateProfessionalDetails] Error:", error);
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.deleteProfessionalDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    await professionalDetailsHandler.deleteByUserId(userId);

    return res.success("Professional details deleted successfully");
  } catch (error) {
    console.error("ProfessionalDetailsController [deleteProfessionalDetails] Error:", error);
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.restoreProfessionalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    const result = await professionalDetailsHandler.restoreByUserId(userId, {
      ...validatedData,
      meta: { updatedBy: userId },
    });

    return res.success({
      message: "Professional details restored successfully",
      data: result,
    });
  } catch (error) {
    console.error("ProfessionalDetailsController [restoreProfessionalDetails] Error:", error);
    return res.serverError(error);
  }
};
