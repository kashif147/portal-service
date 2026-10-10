const PersonalDetails = require("../../models/personal.details.model.js");
const ProfessionalDetails = require("../../models/professional.details.model.js");
const SubscriptionDetails = require("../../models/subscription.model.js");
const { APPLICATION_STATUS } = require("../../constants/enums.js");
const { getEventTenantId } = require("../../helpers/tenantScope.js");

// Helper function to handle bypass user ObjectId conversion
function getReviewerIdForDb(reviewerId) {
  if (reviewerId === "bypass-user") {
    return null; // Allow null for bypass users
  }
  return reviewerId;
}

class ApplicationRejectionListener {
  constructor() {
    // This listener handles applications.review.rejected.v1 events from profile service
  }

  /**
   * @param {object} data - event `data`
   * @param {string} [envelopeTenantId] - payload.tenantId (authoritative);
   *   data.tenantId is the fallback mirror. No tenant => skip + log.
   */
  async handleApplicationRejected(data, envelopeTenantId) {
    try {
      console.log(
        "📥 [APPLICATION_REJECTION_LISTENER] Received application rejected event:",
        {
          applicationId: data.applicationId,
          reviewerId: data.reviewerId,
          reason: data.reason,
          tenantId: data.tenantId,
          timestamp: new Date().toISOString(),
        }
      );

      const { applicationId, reviewerId, reason, notes } = data;

      const tenantId = getEventTenantId({ tenantId: envelopeTenantId }, data);
      if (!tenantId) {
        console.warn(
          "⚠️ [APPLICATION_REJECTION_LISTENER] Event has no tenantId (envelope or data); skipping",
          { applicationId }
        );
        return;
      }

      // Find and update PersonalDetails with rejection status
      const personalDetails = await PersonalDetails.findOne({
        tenantId,
        applicationId: applicationId,
      });

      if (!personalDetails) {
        console.error(
          "❌ [APPLICATION_REJECTION_LISTENER] Personal details not found for Application ID:",
          applicationId
        );
        return;
      }

      console.log("✅ [APPLICATION_REJECTION_LISTENER] Found personal details:", {
        id: personalDetails._id,
        applicationId: personalDetails.applicationId,
        userId: personalDetails.userId,
      });

      // Update PersonalDetails with rejection status and details
      const personalUpdateData = {
        applicationStatus: APPLICATION_STATUS.REJECTED,
        "meta.isActive": false,
        approvalDetails: {
          approvedBy: getReviewerIdForDb(reviewerId),
          approvedAt: new Date(),
          rejectionReason: reason,
          comments: notes ?? null,
        },
      };

      const updatedPersonalDetails = await PersonalDetails.findOneAndUpdate(
        { _id: personalDetails._id, tenantId },
        { $set: personalUpdateData },
        { new: true }
      );

      if (!updatedPersonalDetails) {
        throw new Error(
          `Failed to update personal details. Application ID: ${applicationId}`
        );
      }

      console.log(
        "✅ [APPLICATION_REJECTION_LISTENER] Personal details updated:",
        {
          applicationId,
          newStatus: updatedPersonalDetails.applicationStatus,
          rejectionReason: reason,
        }
      );

      const [profResult, subResult] = await Promise.all([
        ProfessionalDetails.updateMany(
          { tenantId, applicationId },
          { $set: { "meta.isActive": false } }
        ),
        SubscriptionDetails.updateMany(
          { tenantId, applicationId },
          { $set: { "meta.isActive": false } }
        ),
      ]);

      console.log(
        "✅ [APPLICATION_REJECTION_LISTENER] Related records deactivated (meta.isActive):",
        {
          applicationId,
          professionalDetailsModified: profResult.modifiedCount,
          subscriptionDetailsModified: subResult.modifiedCount,
        }
      );

      console.log(
        "✅ [APPLICATION_REJECTION_LISTENER] Application rejection processed successfully:",
        {
          applicationId,
          applicationStatus: APPLICATION_STATUS.REJECTED,
        }
      );
    } catch (error) {
      console.error(
        "❌ [APPLICATION_REJECTION_LISTENER] Error handling application rejection:",
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

module.exports = new ApplicationRejectionListener();

