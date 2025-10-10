const { publishDomainEvent } = require("../events.js");
const PersonalDetails = require("../../models/personal.details.model");
const ProfessionalDetails = require("../../models/professional.details.model");
const SubscriptionDetails = require("../../models/subscription.model");

class ApplicationStatusUpdateListener {
  constructor() {
    // This listener handles application.status.updated events from payment service
  }

  async handleApplicationStatusUpdate(data) {
    try {
      console.log(
        "📥 [STATUS_UPDATE_LISTENER] Received application status update:",
        {
          applicationId: data.applicationId,
          status: data.status,
          paymentIntentId: data.paymentIntentId,
          amount: data.amount,
          currency: data.currency,
          tenantId: data.tenantId,
          timestamp: new Date().toISOString(),
        }
      );

      const {
        applicationId,
        status,
        paymentIntentId,
        amount,
        currency,
        tenantId,
      } = data;

      // 1. Find application with ID
      const personalDetails = await PersonalDetails.findOne({
        ApplicationId: applicationId,
      });

      if (!personalDetails) {
        console.error(
          "❌ [STATUS_UPDATE_LISTENER] Personal details not found for Application ID:",
          applicationId
        );
        return;
      }

      console.log("✅ [STATUS_UPDATE_LISTENER] Found personal details:", {
        id: personalDetails._id,
        applicationId: personalDetails.ApplicationId,
        userId: personalDetails.userId,
      });

      // 2. Update application status
      const updateData = {
        applicationStatus: status,
      };

      const updatedPersonalDetails = await PersonalDetails.findByIdAndUpdate(
        personalDetails._id,
        updateData,
        { new: true }
      );

      console.log(
        "✅ [STATUS_UPDATE_LISTENER] Application status updated to:",
        status
      );

      // 3. Record payment information in subscription details (single source of truth)
      const subscriptionDetails = await SubscriptionDetails.findOne({
        ApplicationId: applicationId,
      });

      if (subscriptionDetails) {
        const subscriptionUpdateData = {
          paymentDetails: {
            paymentIntentId: paymentIntentId,
            amount: amount,
            currency: currency,
            status: status,
            updatedAt: new Date(),
          },
        };

        await SubscriptionDetails.findByIdAndUpdate(
          subscriptionDetails._id,
          subscriptionUpdateData,
          { new: true }
        );

        console.log(
          "✅ [STATUS_UPDATE_LISTENER] Payment information recorded in subscription details"
        );
      }

      // 4. Get all related data for profile service event
      const professionalDetails = await ProfessionalDetails.findOne({
        ApplicationId: applicationId,
      });

      // 5. Emit event to profile service with all schema details
      console.log("📤 [STATUS_UPDATE_LISTENER] Emitting profile service event");
      await publishDomainEvent("profile.service.application.updated", {
        applicationId: applicationId,
        tenantId: tenantId,
        status: status,
        personalDetails: updatedPersonalDetails,
        professionalDetails: professionalDetails,
        subscriptionDetails: subscriptionDetails, // paymentDetails already included here
      });

      console.log(
        "✅ [STATUS_UPDATE_LISTENER] Profile service event emitted successfully"
      );
    } catch (error) {
      console.error(
        "❌ [STATUS_UPDATE_LISTENER] Error handling application status update:",
        {
          error: error.message,
          stack: error.stack,
          applicationId: data?.applicationId,
        }
      );
    }
  }
}

module.exports = new ApplicationStatusUpdateListener();
