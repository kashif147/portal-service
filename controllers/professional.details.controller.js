const professionalDetailsHandler = require("../handlers/professional.details.handler");
const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const joischemas = require("../validation/index.js");
const policyClient = require("../utils/policyClient");
const { AppError } = require("../errors/AppError");

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
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const validatedData =
      await joischemas.professional_details_create.validateAsync(req.body);

    // Get application ID from URL parameters
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.fail("Application ID is required in URL parameters");
    }

    const personalDetails = await personalDetailsHandler.getApplicationById(
      applicationId
    );
    if (!personalDetails) {
      return res.fail("Application not found");
    }

    const existingProfessionalDetails =
      await professionalDetailsHandler.getByApplicationId(applicationId);
    if (existingProfessionalDetails) {
      return res.fail(
        "Professional details already exist for this Application , please update existing details"
      );
    }

    // Validate user permissions
    if (userType === "CRM") {
      // CRM users can create professional details for any application
    } else {
      if (personalDetails.userId?.toString() !== userId?.toString()) {
        return res.fail(
          "Access denied. You can only create professional details for your own applications."
        );
      }
    }

    // Create new professional details
    const result = await professionalDetailsHandler.create({
      ...validatedData,
      ApplicationId: applicationId,
      userId: userId,
      meta: { createdBy: creatorId, userType: userType },
    });

    return res.success(result);
  } catch (error) {
    console.error(
      "ProfessionalDetailsController [createProfessionalDetails] Error:",
      error
    );
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    return res.serverError(error);
  }
};

exports.getProfessionalDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      const professionalDetails =
        await professionalDetailsHandler.getApplicationById(applicationId);
      if (!professionalDetails) {
        return res.fail("Professional details not found");
      }
      return res.success(professionalDetails);
    } else {
      const professionalDetails =
        await professionalDetailsHandler.getByUserIdAndApplicationId(
          userId,
          applicationId
        );
      if (!professionalDetails) {
        return res.fail("Professional details not found");
      }
      return res.success(professionalDetails);
    }
  } catch (error) {
    console.error(
      "ProfessionalDetailsController [getProfessionalDetails] Error:",
      error
    );
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.updateProfessionalDetails = async (req, res) => {
  try {
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    const validatedData =
      await joischemas.professional_details_update.validateAsync(req.body);
    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    let result;
    if (userType === "CRM") {
      result = await professionalDetailsHandler.updateByApplicationId(
        applicationId,
        updatePayload
      );
    } else {
      result = await professionalDetailsHandler.updateByUserIdAndApplicationId(
        userId,
        applicationId,
        updatePayload
      );
    }

    return res.success(result);
  } catch (error) {
    console.error(
      "ProfessionalDetailsController [updateProfessionalDetails] Error:",
      error
    );
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.deleteProfessionalDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      await professionalDetailsHandler.deleteByApplicationId(applicationId);
    } else {
      await professionalDetailsHandler.deleteByUserIdAndApplicationId(
        userId,
        applicationId
      );
    }

    return res.success("Professional details deleted successfully");
  } catch (error) {
    console.error(
      "ProfessionalDetailsController [deleteProfessionalDetails] Error:",
      error
    );
    if (error.message === "Professional details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};
