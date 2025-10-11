const { publishDomainEvent } = require("../events.js");
const { PROFILE_EVENTS } = require("../events/profile.application.create.js");
const PersonalDetails = require("../../models/personal.details.model.js");
const ProfessionalDetails = require("../../models/professional.details.model.js");
const SubscriptionDetails = require("../../models/subscription.model.js");

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
      await publishDomainEvent(PROFILE_EVENTS.APPLICATION_CREATE, {
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
          applicationId: data?.applicationId,
        }
      );
      throw error;
    }
  }
}

module.exports = new ApplicationStatusUpdateListener();
