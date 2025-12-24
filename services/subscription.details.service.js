const subscriptionDetailsHandler = require("../handlers/subscription.details.handler");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const professionalDetailsHandler = require("../handlers/professional.details.handler");
const { APPLICATION_STATUS } = require("../constants/enums");
const { AppError } = require("../errors/AppError");
const ApplicationStatusUpdateListener = require("../rabbitMQ/listeners/application.status.submitted.listener.js");
const mongoose = require("mongoose");

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
    tenantId
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
        throw AppError.conflict(
          "Subscription details already exist for this application, please update existing details"
        );
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
        await professionalDetailsHandler.getApplicationById(applicationId);
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

      // Enforce payment frequency rule: Credit Card = Annually, Others = Monthly
      const {
        enforcePaymentFrequencyRule,
      } = require("../helpers/payment.frequency.helper.js");
      createData.subscriptionDetails = enforcePaymentFrequencyRule(
        createData.subscriptionDetails
      );

      // Ensure submissionDate is set when subscription details are created
      if (!createData.subscriptionDetails.submissionDate) {
        createData.subscriptionDetails.submissionDate = new Date();
      }

      const result = await subscriptionDetailsHandler.create(createData);

      // Get membership category from subscription details or professional details
      let membershipCategoryId =
        result?.subscriptionDetails?.membershipCategory ||
        professionalDetails?.professionalDetails?.membershipCategory;

      // Helper function to check if a value is a MongoDB ObjectId
      const isObjectId = (value) => {
        if (!value) return false;
        if (typeof value !== "string") return false;
        return mongoose.Types.ObjectId.isValid(value) && value.length === 24;
      };

      // If membership category is an ObjectId, fetch the lookup name
      let membershipCategoryName = membershipCategoryId;
      if (isObjectId(membershipCategoryId)) {
        try {
          // Fetch lookup from database
          // Try to get existing model or create schema if needed
          let Lookup;
          try {
            Lookup = mongoose.model("Lookup");
          } catch (modelError) {
            // Model doesn't exist, create it
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
          if (lookup && lookup.lookupname) {
            membershipCategoryName = lookup.lookupname;
            console.log(
              `📋 [SUBSCRIPTION_SERVICE] Resolved membership category ID ${membershipCategoryId} to name: ${membershipCategoryName}`
            );
          } else {
            console.warn(
              `⚠️ [SUBSCRIPTION_SERVICE] Lookup not found for ID: ${membershipCategoryId}`
            );
          }
        } catch (lookupError) {
          console.error(
            `❌ [SUBSCRIPTION_SERVICE] Error fetching lookup for ID ${membershipCategoryId}:`,
            lookupError.message
          );
          // Continue with ID as fallback - won't match "Undergraduate Student" but won't break
        }
      }

      // Check if membership category is "Undergraduate Student"
      const isUndergraduateStudent =
        membershipCategoryName &&
        membershipCategoryName.toLowerCase() === "undergraduate student";

      // Update application status based on membership category:
      // - Undergraduate Student: Change to "submitted" immediately (no payment required)
      // - Other categories: Keep as "in-progress" until payment is received
      let updatedPersonalDetails;
      if (isUndergraduateStudent) {
        console.log(
          "📝 [SUBSCRIPTION_SERVICE] Undergraduate Student - updating status to submitted"
        );
        updatedPersonalDetails =
          await personalDetailsHandler.updateApplicationStatus(
            applicationId,
            APPLICATION_STATUS.SUBMITTED
          );
      } else {
        console.log(
          "ℹ️ [SUBSCRIPTION_SERVICE] Non-Undergraduate Student - keeping status as in-progress until payment is received"
        );
        // Get current personal details without changing status
        updatedPersonalDetails =
          await personalDetailsHandler.getApplicationById(applicationId);
      }

      // For Undergraduate Students, trigger the same event flow as payment processing
      // This ensures all events go through the same unified handler
      if (isUndergraduateStudent && tenantId) {
        try {
          console.log(
            "📤 [SUBSCRIPTION_SERVICE] Triggering profile service event for Undergraduate Student (no payment required)"
          );

          // Use the same handler as payment processing, but with no payment data
          await ApplicationStatusUpdateListener.handleApplicationStatusUpdate({
            applicationId: applicationId,
            status: APPLICATION_STATUS.SUBMITTED,
            paymentIntentId: null, // No payment for undergraduate students
            amount: null,
            currency: null,
            tenantId: tenantId,
          });

          console.log(
            "✅ [SUBSCRIPTION_SERVICE] Profile service event triggered successfully for Undergraduate Student"
          );
        } catch (eventError) {
          console.error(
            "❌ [SUBSCRIPTION_SERVICE] Failed to trigger profile service event:",
            eventError
          );
          // Don't throw - subscription details were created successfully
          // Event publishing failure shouldn't block the response
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
  async updateSubscriptionDetails(applicationId, updateData, userId, userType) {
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

      // Enforce payment frequency rule if subscriptionDetails are being updated
      if (safeUpdateData.subscriptionDetails) {
        const {
          enforcePaymentFrequencyRule,
        } = require("../helpers/payment.frequency.helper.js");
        safeUpdateData.subscriptionDetails = enforcePaymentFrequencyRule(
          safeUpdateData.subscriptionDetails
        );
      }

      const updatePayload = {
        ...safeUpdateData,
        meta: { updatedBy: userId, userType },
      };

      let result;
      if (userType === "CRM") {
        result = await subscriptionDetailsHandler.updateByApplicationId(
          applicationId,
          updatePayload
        );
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
}

module.exports = new SubscriptionDetailsService();
