const professionalDetailsHandler = require("../handlers/professional.details.handler");
const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");

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
    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);
    const validatedData = await joischemas.professional_details_create.validateAsync(req.body);

    try {
      if (userType === "CRM") {
        // For CRM users, check if professional details exist by ApplicationId
        const existingProfessionalDetails = await professionalDetailsHandler.getByApplicationId(validatedData.ApplicationId);
        if (existingProfessionalDetails) {
          return res.fail("Professional details already exist for this Application ID, please update existing details");
        }
      } else {
        const existingProfessionalDetails = await professionalDetailsHandler.getByUserId(userId);
        if (existingProfessionalDetails) {
          return res.fail("Professional details already exist, please update existing details");
        }
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
      meta: { createdBy: creatorId, userType },
    });

    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [createProfessionalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.getProfessionalDetails = async (req, res) => {
  try {
    const { userType } = extractUserAndCreatorContext(req);

    let result;
    if (userType === "CRM") {
      const applicationId = req.params.applicationId || req.query.applicationId;
      if (!applicationId) {
        return res.fail("Application ID parameter is required for CRM operations");
      }
      result = await professionalDetailsHandler.getByApplicationId(applicationId);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      result = await professionalDetailsHandler.getByUserId(userId);
    }

    return res.success(result);
  } catch (error) {
    console.error("ProfessionalDetailsController [getProfessionalDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.updateProfessionalDetails = async (req, res) => {
  try {
    const { userType, creatorId } = extractUserAndCreatorContext(req);
    const validatedData = await joischemas.professional_details_update.validateAsync(req.body);

    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    let result;
    if (userType === "CRM") {
      const applicationId = req.params.applicationId || req.query.applicationId;
      if (!applicationId) {
        return res.fail("Application ID parameter is required for CRM operations");
      }
      result = await professionalDetailsHandler.updateByApplicationId(applicationId, updatePayload);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      result = await professionalDetailsHandler.updateByUserId(userId, updatePayload);
    }

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
    const { userType } = extractUserAndCreatorContext(req);

    if (userType === "CRM") {
      const applicationId = req.params.applicationId || req.query.applicationId;
      if (!applicationId) {
        return res.fail("Application ID parameter is required for CRM operations");
      }
      await professionalDetailsHandler.deleteByApplicationId(applicationId);
    } else {
      const { userId } = extractUserAndCreatorContext(req);
      await professionalDetailsHandler.deleteByUserId(userId);
    }

    return res.success("Professional details deleted successfully");
  } catch (error) {
    console.error("ProfessionalDetailsController [deleteProfessionalDetails] Error:", error);
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};
