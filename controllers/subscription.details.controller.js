const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const professionalDetailsHandler = require("../handlers/professional.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const joischemas = require("../validation/index.js");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const { APPLICATION_STATUS } = require("../constants/enums");

// Function to extract professional details for subscription
// const extractProfessionalDetailsForSubscription = async (userId) => {
//   try {
//     const professionalDetails = await professionalDetailsHandler.getByUserId(userId);
//     if (professionalDetails && professionalDetails.professionalDetails) {
//       return {
//         membershipCategory: professionalDetails.professionalDetails.membershipCategory,
//         workLocation: professionalDetails.professionalDetails.workLocation,
//         otherWorkLocation: professionalDetails.professionalDetails.otherWorkLocation,
//         region: professionalDetails.professionalDetails.region,
//         branch: professionalDetails.professionalDetails.branch,
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error("Error extracting professional details:", error);
//     return null;
//   }
// };

exports.createSubscriptionDetails = async (req, res) => {
  try {
    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);
    const validatedData = await joischemas.subscription_details_create.validateAsync(req.body);

    // Get application ID from URL parameters
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      return res.fail("Application ID is required in URL parameters");
    }

    const personalDetails = await personalDetailsHandler.getApplicationById(applicationId);
    if (!personalDetails) {
      return res.fail("Application not found");
    }

    const existingSubscriptionDetails = await subscriptionDetailsHandler.getByApplicationId(applicationId);
    if (existingSubscriptionDetails) {
      return res.fail("Subscription details already exist for this Application ID, please update existing details");
    }

    // Validate user permissions
    if (userType === "CRM") {
      // CRM users can create for any application - no user ID check needed
    } else {
      // PORTAL users can only create for their own applications
      if (personalDetails.userId?.toString() !== userId?.toString()) {
        return res.fail("Access denied. You can only create subscription details for your own applications.");
      }
    }

    // Create new subscription details
    const result = await subscriptionDetailsHandler.create({
      ...validatedData,
      ApplicationId: applicationId,
      userId: userId,
      meta: { createdBy: creatorId, userType },
    });

    // Update application status to submitted (complete application)
    await personalDetailsHandler.updateApplicationStatus(applicationId, APPLICATION_STATUS.SUBMITTED);

    return res.success(result);
  } catch (error) {
    console.error("SubscriptionDetailsController [createSubscriptionDetails] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    return res.serverError(error);
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      const subscriptionDetails = await subscriptionDetailsHandler.getApplicationById(applicationId);
      if (!subscriptionDetails) {
        return res.fail("Subscription details not found");
      }
      return res.success(subscriptionDetails);
    } else {
      const subscriptionDetails = await subscriptionDetailsHandler.getByUserIdAndApplicationId(userId, applicationId);
      if (!subscriptionDetails) {
        return res.fail("Subscription details not found");
      }
      return res.success(subscriptionDetails);
    }
  } catch (error) {
    console.error("SubscriptionDetailsController [getSubscriptionDetails] Error:", error);
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.updateSubscriptionDetails = async (req, res) => {
  try {
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    const validatedData = await joischemas.subscription_details_update.validateAsync(req.body);
    const updatePayload = {
      ...validatedData,
      meta: { updatedBy: creatorId, userType },
    };

    let result;
    if (userType === "CRM") {
      result = await subscriptionDetailsHandler.updateByApplicationId(applicationId, updatePayload);
    } else {
      result = await subscriptionDetailsHandler.updateByUserIdAndApplicationId(userId, applicationId, updatePayload);
    }

    return res.success(result);
  } catch (error) {
    console.error("SubscriptionDetailsController [updateSubscriptionDetails] Error:", error);
    if (error.isJoi) {
      return res.fail("Validation error: " + error.message);
    }
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.deleteSubscriptionDetails = async (req, res) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return res.fail("Application ID is required");
    }

    if (userType === "CRM") {
      await subscriptionDetailsHandler.deleteByApplicationId(applicationId);
    } else {
      await subscriptionDetailsHandler.deleteByUserIdAndApplicationId(userId, applicationId);
    }

    return res.success("Subscription details deleted successfully");
  } catch (error) {
    console.error("SubscriptionDetailsController [deleteSubscriptionDetails] Error:", error);
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};
