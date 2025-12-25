const PersonalDetails = require("../../models/personal.details.model.js");
const ProfessionalDetails = require("../../models/professional.details.model.js");
const SubscriptionDetails = require("../../models/subscription.model.js");
const { APPLICATION_STATUS } = require("../../constants/enums.js");

// Helper function to handle bypass user ObjectId conversion
function getReviewerIdForDb(reviewerId) {
  if (reviewerId === "bypass-user") {
    return null; // Allow null for bypass users
  }
  return reviewerId;
}

class ApplicationApprovalListener {
  constructor() {
    // This listener handles applications.review.approved.v1 events from profile service
  }

  async handleApplicationApproved(data) {
    try {
      console.log(
        "📥 [APPLICATION_APPROVAL_LISTENER] Received application approved event:",
        {
          applicationId: data.applicationId,
          profileId: data.profileId,
          applicationStatus: data.applicationStatus,
          isExistingProfile: data.isExistingProfile,
          reviewerId: data.reviewerId,
          tenantId: data.tenantId,
          timestamp: new Date().toISOString(),
        }
      );

      const {
        applicationId,
        reviewerId,
        profileId,
        applicationStatus,
        isExistingProfile,
        effective,
        subscriptionAttributes,
        tenantId,
      } = data;

      // 1. Find and update PersonalDetails with approval status
      const personalDetails = await PersonalDetails.findOne({
        applicationId: applicationId,
      });

      if (!personalDetails) {
        console.error(
          "❌ [APPLICATION_APPROVAL_LISTENER] Personal details not found for Application ID:",
          applicationId
        );
        return;
      }

      console.log("✅ [APPLICATION_APPROVAL_LISTENER] Found personal details:", {
        id: personalDetails._id,
        applicationId: personalDetails.applicationId,
        userId: personalDetails.userId,
      });

      // Update PersonalDetails with approval status and details
      const personalUpdateData = {
        applicationStatus: APPLICATION_STATUS.APPROVED,
        approvalDetails: {
          approvedBy: getReviewerIdForDb(reviewerId),
          approvedAt: new Date(),
        },
      };

      // Update effective personal info and contact info if provided
      if (effective?.personalInfo) {
        personalUpdateData.personalInfo = effective.personalInfo;
      }
      if (effective?.contactInfo) {
        personalUpdateData.contactInfo = effective.contactInfo;
      }

      const updatedPersonalDetails = await PersonalDetails.findByIdAndUpdate(
        personalDetails._id,
        { $set: personalUpdateData },
        { new: true }
      );

      if (!updatedPersonalDetails) {
        throw new Error(
          `Failed to update personal details. Application ID: ${applicationId}`
        );
      }

      console.log(
        "✅ [APPLICATION_APPROVAL_LISTENER] Personal details updated:",
        {
          applicationId,
          newStatus: updatedPersonalDetails.applicationStatus,
        }
      );

      // 2. Update ProfessionalDetails if provided
      if (effective?.professionalDetails) {
        const professionalDetails = await ProfessionalDetails.findOne({
          applicationId: applicationId,
        });

        if (professionalDetails) {
          await ProfessionalDetails.findByIdAndUpdate(
            professionalDetails._id,
            { $set: { professionalDetails: effective.professionalDetails } },
            { new: true }
          );
          console.log(
            "✅ [APPLICATION_APPROVAL_LISTENER] Professional details updated"
          );
        } else {
          console.warn(
            "⚠️ [APPLICATION_APPROVAL_LISTENER] Professional details not found for application:",
            applicationId
          );
        }
      }

      // 3. Update SubscriptionDetails if provided
      if (effective?.subscriptionDetails) {
        const subscriptionDetails = await SubscriptionDetails.findOne({
          applicationId: applicationId,
        });

        if (subscriptionDetails) {
          const subscriptionUpdateData = {
            subscriptionDetails: effective.subscriptionDetails,
          };

          // Update subscription attributes if provided
          if (subscriptionAttributes) {
            subscriptionUpdateData.subscriptionAttributes = subscriptionAttributes;
          }

          await SubscriptionDetails.findByIdAndUpdate(
            subscriptionDetails._id,
            { $set: subscriptionUpdateData },
            { new: true }
          );
          console.log(
            "✅ [APPLICATION_APPROVAL_LISTENER] Subscription details updated"
          );
        } else {
          console.warn(
            "⚠️ [APPLICATION_APPROVAL_LISTENER] Subscription details not found for application:",
            applicationId
          );
        }
      }

      console.log(
        "✅ [APPLICATION_APPROVAL_LISTENER] Application approval processed successfully:",
        {
          applicationId,
          applicationStatus,
          profileId,
          isExistingProfile,
        }
      );
    } catch (error) {
      console.error(
        "❌ [APPLICATION_APPROVAL_LISTENER] Error handling application approval:",
        {
          error: error.message,
          stack: error.stack,
          applicationId: data?.applicationId,
        }
      );
      throw error;
    }
  }
}

module.exports = new ApplicationApprovalListener();




