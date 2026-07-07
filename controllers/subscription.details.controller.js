const subscriptionDetailsService = require("../services/subscription.details.service");
const professionalDetailsHandler = require("../handlers/professional.details.handler");
const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const joischemas = require("../validation/index.js");
const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const { APPLICATION_STATUS } = require("../constants/enums");
const { PolicyClient } = require("@membership/policy-middleware");
const { AppError } = require("../errors/AppError");
const {
  pickRequestedSubscriptionDetails,
  syncLegacyProfessionalFieldsFromSubscriptionBody,
} = require("../helpers/membershipCategory.helper.js");

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

exports.createSubscriptionDetails = async (req, res, next) => {
  try {
    const { userId, creatorId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    await syncLegacyProfessionalFieldsFromSubscriptionBody({
      applicationId,
      body: req.body,
      userId,
      userType,
      professionalDetailsHandler,
      subscriptionDetailsHandler,
    });

    const validatedData =
      await joischemas.subscription_details_create.validateAsync(req.body);

    // Get tenantId from request context
    const tenantId = req.tenantId || req.ctx?.tenantId;

    // Create new subscription details
    const result = await subscriptionDetailsService.createSubscriptionDetails(
      validatedData,
      applicationId,
      userId,
      userType,
      tenantId,
      req
    );

    return res.success(result);
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [createSubscriptionDetails] Error:",
      error
    );
    if (error.isJoi) {
      return next(AppError.badRequest("Validation error: " + error.message));
    }
    return next(error);
  }
};

exports.getSubscriptionDetails = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    const subscriptionDetails =
      await subscriptionDetailsService.getSubscriptionDetails(
        applicationId,
        userId,
        userType
      );

    if (!subscriptionDetails) {
      return res.notFoundRecord("Subscription details not found");
    }

    return res.success(subscriptionDetails);
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [getSubscriptionDetails] Error:",
      error
    );
    if (error.message === "Application not found") {
      return next(AppError.notFound("Application not found"));
    }
    if (error.message === "Subscription details not found") {
      return res.notFoundRecord("Subscription details not found");
    }
    return next(error);
  }
};

exports.updateSubscriptionDetails = async (req, res, next) => {
  try {
    const { userId, userType, creatorId } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    await syncLegacyProfessionalFieldsFromSubscriptionBody({
      applicationId,
      body: req.body,
      userId,
      userType,
      professionalDetailsHandler,
      subscriptionDetailsHandler,
    });

    const validatedData = pickRequestedSubscriptionDetails(
      await joischemas.subscription_details_update.validateAsync(req.body),
      req.body
    );
    const updatePayload = {
      ...validatedData,
      "meta.updatedBy": creatorId,
      "meta.userType": userType,
    };

    const result = await subscriptionDetailsService.updateSubscriptionDetails(
      applicationId,
      updatePayload,
      userId,
      userType,
      req
    );

    return res.success(result);
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [updateSubscriptionDetails] Error:",
      error
    );
    if (error.isJoi) {
      return next(AppError.badRequest("Validation error: " + error.message));
    }
    if (error.message === "Subscription details not found") {
      return res.notFoundRecord("Subscription details not found");
    }
    return next(error);
  }
};

exports.confirmApplicationPayment = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;
    const paymentIntentId = String(req.body?.paymentIntentId || "").trim();

    const tenantId = req.tenantId || req.ctx?.tenantId;
    const result = await subscriptionDetailsService.confirmApplicationPayment(
      applicationId,
      paymentIntentId,
      userId,
      userType,
      tenantId,
      req
    );

    return res.success(result);
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [confirmApplicationPayment] Error:",
      error
    );
    return next(error);
  }
};

exports.deleteSubscriptionDetails = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);
    const applicationId = req.params.applicationId;

    if (!applicationId) {
      return next(AppError.badRequest("Application ID is required"));
    }

    await subscriptionDetailsService.deleteSubscriptionDetails(
      applicationId,
      userId,
      userType
    );

    return res.success("Subscription details deleted successfully");
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [deleteSubscriptionDetails] Error:",
      error
    );
    if (error.message === "Subscription details not found") {
      return res.notFoundRecord("Subscription details not found");
    }
    return next(error);
  }
};

exports.getMySubscriptionDetails = async (req, res, next) => {
  try {
    const { userId, userType } = extractUserAndCreatorContext(req);

    // Only allow PORTAL users to access this endpoint
    if (userType !== "PORTAL") {
      return next(AppError.forbidden("Access denied. Only for PORTAL users."));
    }

    if (!userId) {
      return next(AppError.badRequest("User ID is required"));
    }

    const subscriptionDetails =
      await subscriptionDetailsService.getMySubscriptionDetails(userId);

    if (!subscriptionDetails) {
      return res.notFoundRecord("Subscription details not found");
    }

    return res.success(subscriptionDetails);
  } catch (error) {
    console.error(
      "SubscriptionDetailsController [getMySubscriptionDetails] Error:",
      error
    );
    if (error.message === "Subscription details not found") {
      return res.notFoundRecord("Subscription details not found");
    }
    return next(error);
  }
};
