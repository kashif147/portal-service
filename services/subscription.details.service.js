const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const professionalDetailsHandler = require("../handlers/professional.details.handler");
const { APPLICATION_STATUS } = require("../constants/enums");
const { AppError } = require("../errors/AppError");
const ApplicationStatusUpdateListener = require("../rabbitMQ/listeners/application.status.submitted.listener.js");
const {
  isReapplyApplication,
  reactivatePersonalApplicationForReapply,
} = require("../helpers/reactivatePortalApplication.helper.js");
const mongoose = require("mongoose");

async function resolveMembershipCategoryName(membershipCategoryId) {
  if (!membershipCategoryId) return null;

  const isObjectId = (value) =>
    typeof value === "string" &&
    mongoose.Types.ObjectId.isValid(value) &&
    value.length === 24;

  if (!isObjectId(membershipCategoryId)) {
    return membershipCategoryId;
  }

  try {
    let Lookup;
    try {
      Lookup = mongoose.model("Lookup");
    } catch {
      const lookupSchema = new mongoose.Schema(
        {
          code: { type: String, required: true },
          lookupname: { type: String, required: true },
          DisplayName: { type: String },
          Parentlookupid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lookup",
            default: null,
          },
          lookuptypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LookupType",
            required: true,
          },
          isdeleted: { type: Boolean, default: false },
          isactive: { type: Boolean, default: true },
          userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
        },
        { timestamps: true }
      );
      Lookup = mongoose.model("Lookup", lookupSchema);
    }

    const lookup = await Lookup.findById(membershipCategoryId);
    return lookup?.lookupname || membershipCategoryId;
  } catch (lookupError) {
    console.error(
      `❌ [SUBSCRIPTION_SERVICE] Error fetching lookup for ID ${membershipCategoryId}:`,
      lookupError.message
    );
    return membershipCategoryId;
  }
}

async function handlePostSubscriptionSubmission({
  result,
  applicationId,
  professionalDetails,
  tenantId,
}) {
  const membershipCategoryId =
    result?.subscriptionDetails?.membershipCategory ||
    professionalDetails?.professionalDetails?.membershipCategory;

  const membershipCategoryName =
    await resolveMembershipCategoryName(membershipCategoryId);

  const isUndergraduateStudent =
    membershipCategoryName &&
    membershipCategoryName.toLowerCase() === "undergraduate student";

  if (isUndergraduateStudent) {
    console.log(
      "📝 [SUBSCRIPTION_SERVICE] Undergraduate Student - updating status to submitted"
    );
    await personalDetailsHandler.updateApplicationStatus(
      applicationId,
      APPLICATION_STATUS.SUBMITTED
    );
  } else {
    console.log(
      "ℹ️ [SUBSCRIPTION_SERVICE] Non-Undergraduate Student - keeping status as in-progress until payment is received"
    );
  }

  if (isUndergraduateStudent && tenantId) {
    try {
      console.log(
        "📤 [SUBSCRIPTION_SERVICE] Triggering profile service event for Undergraduate Student (no payment required)"
      );

      await ApplicationStatusUpdateListener.handleApplicationStatusUpdate({
        applicationId,
        status: APPLICATION_STATUS.SUBMITTED,
        paymentIntentId: null,
        amount: null,
        currency: null,
        tenantId,
      });

      console.log(
        "✅ [SUBSCRIPTION_SERVICE] Profile service event triggered successfully for Undergraduate Student"
      );
    } catch (eventError) {
      console.error(
        "❌ [SUBSCRIPTION_SERVICE] Failed to trigger profile service event:",
        eventError
      );
    }
  } else if (!isUndergraduateStudent) {
    console.log(
      "ℹ️ [SUBSCRIPTION_SERVICE] Membership category is not 'Undergraduate Student', event will be published when payment is processed"
    );
  } else if (!tenantId) {
    console.warn(
      "⚠️ [SUBSCRIPTION_SERVICE] tenantId not provided, skipping RabbitMQ event publication"
    );
  }

  return result;
}

/**
 * Subscription Details Service Layer
 * Contains business logic for subscription details operations
 */
class SubscriptionDetailsService {
  /**
   * Create subscription details
   * @param {Object} data - Subscription details data
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID
   * @param {string} userType - User type (CRM/PORTAL)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Created subscription details
   */
  async createSubscriptionDetails(
    data,
    applicationId,
    userId,
    userType,
    tenantId,
    req = null
  ) {
    try {
      if (!data) {
        throw AppError.badRequest("Subscription details data is required");
      }

      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      // Check if application exists
      const personalDetails = await personalDetailsHandler.getApplicationById(
        applicationId
      );
      if (!personalDetails) {
        throw AppError.notFound("Application not found");
      }

      // Check if subscription details already exist
      const existingDetails =
        await subscriptionDetailsHandler.getByApplicationId(applicationId);
      if (existingDetails) {
        if (userType !== "CRM") {
          if (personalDetails.userId?.toString() !== userId?.toString()) {
            throw AppError.forbidden(
              "Access denied. You can only update subscription details for your own applications."
            );
          }
        }

        if (isReapplyApplication(personalDetails)) {
          await reactivatePersonalApplicationForReapply(applicationId);
        }

        const professionalDetails =
          await professionalDetailsHandler.getByApplicationId(applicationId);
        const membershipCategoryFromProfessional =
          professionalDetails?.professionalDetails?.membershipCategory ?? null;

        const updateData = {
          ...data,
          "meta.updatedBy": userId,
          "meta.userType": userType,
          "meta.isActive": true,
        };

        if (!updateData.subscriptionDetails) {
          updateData.subscriptionDetails = {};
        }

        if (
          updateData.subscriptionDetails.membershipCategory == null &&
          membershipCategoryFromProfessional != null
        ) {
          updateData.subscriptionDetails.membershipCategory =
            membershipCategoryFromProfessional;
        }

        const {
          enforcePaymentFrequencyRule,
        } = require("../helpers/payment.frequency.helper.js");
        const {
          assertSalaryDeductionAllowedForWorkLocation,
        } = require("../helpers/workLocationPayment.helper.js");
        const {
          applyNoFeeMembershipPaymentDefaults,
        } = require("../helpers/noFeeMembershipPayment.helper.js");

        updateData.subscriptionDetails = applyNoFeeMembershipPaymentDefaults(
          updateData.subscriptionDetails,
        );
        updateData.subscriptionDetails = enforcePaymentFrequencyRule(
          updateData.subscriptionDetails
        );
        await assertSalaryDeductionAllowedForWorkLocation(
          updateData.subscriptionDetails,
          professionalDetails?.professionalDetails,
          {
            req,
            tenantId,
            professionalDetailsOverride: req?.body?.professionalDetails,
          }
        );

        const result = await subscriptionDetailsHandler.updateByApplicationId(
          applicationId,
          updateData
        );

        if (!updateData.subscriptionDetails?.submissionDate) {
          await subscriptionDetailsHandler.updateByApplicationId(applicationId, {
            "subscriptionDetails.submissionDate": new Date(),
          });
        }

        return handlePostSubscriptionSubmission({
          result,
          applicationId,
          professionalDetails,
          tenantId,
        });
      }

      // Validate user permissions for PORTAL users
      if (userType !== "CRM") {
        if (personalDetails.userId?.toString() !== userId?.toString()) {
          throw AppError.forbidden(
            "Access denied. You can only create subscription details for your own applications."
          );
        }
      }

      const professionalDetails =
        await professionalDetailsHandler.getByApplicationId(applicationId);
      const membershipCategoryFromProfessional =
        professionalDetails?.professionalDetails?.membershipCategory ?? null;

      const createData = {
        ...data,
        applicationId: applicationId,
        userId: userId,
        meta: { createdBy: userId, userType },
      };

      if (!createData.subscriptionDetails) {
        createData.subscriptionDetails = {};
      }

      if (
        createData.subscriptionDetails.membershipCategory == null &&
        membershipCategoryFromProfessional != null
      ) {
        createData.subscriptionDetails.membershipCategory =
          membershipCategoryFromProfessional;
      }

      const {
        enforcePaymentFrequencyRule,
      } = require("../helpers/payment.frequency.helper.js");
      const {
        assertSalaryDeductionAllowedForWorkLocation,
      } = require("../helpers/workLocationPayment.helper.js");
      const {
        applyNoFeeMembershipPaymentDefaults,
      } = require("../helpers/noFeeMembershipPayment.helper.js");

      createData.subscriptionDetails = applyNoFeeMembershipPaymentDefaults(
        createData.subscriptionDetails,
      );
      createData.subscriptionDetails = enforcePaymentFrequencyRule(
        createData.subscriptionDetails
      );
      await assertSalaryDeductionAllowedForWorkLocation(
        createData.subscriptionDetails,
        professionalDetails?.professionalDetails,
        {
          req,
          tenantId,
          professionalDetailsOverride: req?.body?.professionalDetails,
        }
      );

      // Ensure submissionDate is set when subscription details are created
      if (!createData.subscriptionDetails.submissionDate) {
        createData.subscriptionDetails.submissionDate = new Date();
      }

      const result = await subscriptionDetailsHandler.create(createData);

      return handlePostSubscriptionSubmission({
        result,
        applicationId,
        professionalDetails,
        tenantId,
      });
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [createSubscriptionDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get subscription details by application ID
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Subscription details
   */
  async getSubscriptionDetails(applicationId, userId, userType) {
    try {
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      // Validate parent resource: check if application exists
      const personalDetails = await personalDetailsHandler.getApplicationById(
        applicationId
      );
      if (!personalDetails) {
        throw AppError.notFound("Application not found");
      }

      if (userType === "CRM") {
        return await subscriptionDetailsHandler.getApplicationById(
          applicationId
        );
      } else {
        return await subscriptionDetailsHandler.getByUserIdAndApplicationId(
          userId,
          applicationId
        );
      }
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [getSubscriptionDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Update subscription details
   * @param {string} applicationId - Application ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Updated subscription details
   */
  async updateSubscriptionDetails(
    applicationId,
    updateData,
    userId,
    userType,
    req = null
  ) {
    try {
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      if (!updateData) {
        throw AppError.badRequest("Update data is required");
      }

      // Preserve protected fields - don't allow API updates to overwrite them
      // - paymentDetails: only updated by payment webhook events
      // - membershipNumber: only set during approval in profile-service
      const { paymentDetails, membershipNumber, ...safeUpdateData } =
        updateData;

      if (paymentDetails) {
        console.warn(
          "⚠️ [SUBSCRIPTION_SERVICE] Ignoring paymentDetails in update - payment info is managed by payment webhooks"
        );
      }

      if (membershipNumber) {
        console.warn(
          "⚠️ [SUBSCRIPTION_SERVICE] Ignoring membershipNumber in update - membership numbers are generated during approval"
        );
      }

      if (safeUpdateData.subscriptionDetails) {
        const {
          enforcePaymentFrequencyRule,
        } = require("../helpers/payment.frequency.helper.js");
        const {
          assertSalaryDeductionAllowedForWorkLocation,
        } = require("../helpers/workLocationPayment.helper.js");
        const {
          applyNoFeeMembershipPaymentDefaults,
        } = require("../helpers/noFeeMembershipPayment.helper.js");
        const [professionalDetails, existingDetails] = await Promise.all([
          professionalDetailsHandler.getByApplicationId(applicationId),
          subscriptionDetailsHandler.getByApplicationId(applicationId),
        ]);

        const mergedSubscriptionDetails = {
          ...(existingDetails?.subscriptionDetails || {}),
          ...safeUpdateData.subscriptionDetails,
        };

        safeUpdateData.subscriptionDetails = applyNoFeeMembershipPaymentDefaults(
          mergedSubscriptionDetails,
        );
        safeUpdateData.subscriptionDetails = enforcePaymentFrequencyRule(
          safeUpdateData.subscriptionDetails,
        );
        await assertSalaryDeductionAllowedForWorkLocation(
          safeUpdateData.subscriptionDetails,
          professionalDetails?.professionalDetails,
          {
            req,
            tenantId:
              req?.tenantId ||
              req?.ctx?.tenantId ||
              existingDetails?.tenantId ||
              "",
            professionalDetailsOverride: req?.body?.professionalDetails,
          }
        );
      }

      const updatePayload = {
        ...safeUpdateData,
        "meta.updatedBy": userId,
        "meta.userType": userType,
      };

      let result;
      if (userType === "CRM") {
        const existingDetails =
          await subscriptionDetailsHandler.getByApplicationId(applicationId);

        if (!existingDetails) {
          const personalDetails = await personalDetailsHandler.getApplicationById(
            applicationId
          );
          if (!personalDetails) {
            throw AppError.notFound("Application not found");
          }

          result = await subscriptionDetailsHandler.create({
            applicationId,
            userId: personalDetails.userId ?? userId,
            subscriptionDetails: safeUpdateData.subscriptionDetails || {},
            meta: {
              createdBy: userId,
              userType,
            },
          });
        } else {
          result = await subscriptionDetailsHandler.updateByApplicationId(
            applicationId,
            updatePayload
          );
        }
      } else {
        result =
          await subscriptionDetailsHandler.updateByUserIdAndApplicationId(
            userId,
            applicationId,
            updatePayload
          );
      }

      return result;
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [updateSubscriptionDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Delete subscription details
   * @param {string} applicationId - Application ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} userType - User type (CRM/PORTAL)
   * @returns {Promise<Object>} Deleted subscription details
   */
  async deleteSubscriptionDetails(applicationId, userId, userType) {
    try {
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      let result;
      if (userType === "CRM") {
        result = await subscriptionDetailsHandler.deleteByApplicationId(
          applicationId
        );
      } else {
        result =
          await subscriptionDetailsHandler.deleteByUserIdAndApplicationId(
            userId,
            applicationId
          );
      }

      return result;
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [deleteSubscriptionDetails] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Check if subscription details exist for application
   * @param {string} applicationId - Application ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async checkSubscriptionDetailsExist(applicationId) {
    try {
      if (!applicationId) {
        throw AppError.badRequest("Application ID is required");
      }

      const details = await subscriptionDetailsHandler.getByApplicationId(
        applicationId
      );
      return !!details;
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [checkSubscriptionDetailsExist] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get subscription details by email
   * @param {string} email - Email address
   * @returns {Promise<Object>} Subscription details
   */
  async getSubscriptionDetailsByEmail(email) {
    try {
      if (!email) {
        throw AppError.badRequest("Email is required");
      }

      return await subscriptionDetailsHandler.getByEmail(email);
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [getSubscriptionDetailsByEmail] Error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get my subscription details (for PORTAL users)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Subscription details
   */
  async getMySubscriptionDetails(userId) {
    try {
      if (!userId) {
        throw AppError.badRequest("User ID is required");
      }

      const subscriptionDetails = await subscriptionDetailsHandler.getByUserId(userId);
      
      if (!subscriptionDetails) {
        throw new Error("Subscription details not found");
      }

      return subscriptionDetails;
    } catch (error) {
      console.error(
        "SubscriptionDetailsService [getMySubscriptionDetails] Error:",
        error
      );
      throw error;
    }
  }
}

module.exports = new SubscriptionDetailsService();
