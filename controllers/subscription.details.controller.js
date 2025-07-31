const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const professionalDetailsHandler = require("../handlers/professional.details.handler");

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
    const userId = req.user.id;
    const validatedData = req.body;

    // Check if subscription details exist
    const existingSubscriptionDetails = await subscriptionDetailsHandler.getByUserId(userId);
    if (existingSubscriptionDetails) {
      return res.fail("Subscription details already exist, please update existing details");
    }
    if (validatedData.ApplicationId) {
      const applicationId = await professionalDetailsHandler.checkApplicationId(validatedData.ApplicationId);
      if (!applicationId) {
        return res.fail("Application ID not found, please enter a valid application ID");
      }
    }

    // // Extract professional details for subscription
    // const professionalDetailsForSubscription = await extractProfessionalDetailsForSubscription(userId);

    // // Create new subscription details
    const result = await subscriptionDetailsHandler.create({
      ...validatedData,
      userId,
      // professionalDetails: professionalDetailsForSubscription,
      meta: { createdBy: userId },
    });

    return res.success(result);
  } catch (error) {
    console.error("SubscriptionDetailsController [createSubscriptionDetails] Error:", error);
    return res.serverError(error);
  }
};

exports.getSubscriptionDetailsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await subscriptionDetailsHandler.getByUserId(userId);
    if (!result) {
      return res.fail("Subscription details not found");
    }
    if (result.meta && result.meta.deleted) {
      return res.success("Subscription details deleted, please restore to continue");
    }
    return res.success(result);
  } catch (error) {
    console.error("SubscriptionDetailsController [getSubscriptionDetailsByUserId] Error:", error);
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await subscriptionDetailsHandler.getByUserId(userId);
    if (!result) {
      return res.fail("Subscription details not found");
    }
    const checkifSoftDeleted = await subscriptionDetailsHandler.checkifSoftDeleted(userId);
    if (checkifSoftDeleted) {
      return res.success("Subscription details deleted, please restore to continue");
    }
    return res.success(result);
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
    const userId = req.user.id;
    const updatePayload = {
      ...req.body,
      meta: { updatedBy: userId },
    };

    const result = await subscriptionDetailsHandler.updateByUserId(userId, updatePayload);

    return res.success({
      message: "Updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("SubscriptionDetailsController [updateSubscriptionDetails] Error:", error);
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.deleteSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    await subscriptionDetailsHandler.deleteByUserId(userId);

    return res.success("Subscription details deleted successfully");
  } catch (error) {
    console.error("SubscriptionDetailsController [deleteSubscriptionDetails] Error:", error);
    if (error.message === "Subscription details not found") {
      return res.fail(error.message);
    }
    return res.serverError(error);
  }
};

exports.restoreSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = req.body;

    const result = await subscriptionDetailsHandler.restoreByUserId(userId, {
      ...validatedData,
    });

    return res.success({
      message: "Subscription details restored successfully",
      data: result,
    });
  } catch (error) {
    console.error("SubscriptionDetailsController [restoreSubscriptionDetails] Error:", error);
    return res.serverError(error);
  }
};
