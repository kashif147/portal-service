const PersonalDetails = require("../../models/personal.details.model.js");
const { APPLICATION_STATUS } = require("../../constants/enums.js");

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

  async handleApplicationRejected(data) {
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

      const { applicationId, reviewerId, reason, notes, tenantId } = data;

      // Find and update PersonalDetails with rejection status
      const personalDetails = await PersonalDetails.findOne({
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
        approvalDetails: {
          approvedBy: getReviewerIdForDb(reviewerId),
          approvedAt: new Date(),
          rejectionReason: reason,
          comments: notes ?? null,
        },
      };

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
        "✅ [APPLICATION_REJECTION_LISTENER] Personal details updated:",
        {
          applicationId,
          newStatus: updatedPersonalDetails.applicationStatus,
          rejectionReason: reason,
        }
      );

      // Note: ProfessionalDetails and SubscriptionDetails are kept as-is (not deleted)
      // No Profile is created for rejected applications

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

