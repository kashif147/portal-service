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

      // Validate required payment data
      if (!paymentIntentId || !amount || !currency) {
        console.warn(
          "⚠️ [STATUS_UPDATE_LISTENER] Missing payment information:",
          {
            applicationId,
            hasPaymentIntentId: !!paymentIntentId,
            hasAmount: !!amount,
            hasCurrency: !!currency,
          }
        );
      }

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
      let subscriptionDetails = await SubscriptionDetails.findOne({
        ApplicationId: applicationId,
      });

      if (subscriptionDetails) {
        // Update existing subscription details with payment information
        console.log(
          "📝 [STATUS_UPDATE_LISTENER] Updating existing subscription details:",
          {
            subscriptionId: subscriptionDetails._id,
            applicationId: subscriptionDetails.ApplicationId,
            currentPaymentDetails: subscriptionDetails.paymentDetails,
          }
        );

        const subscriptionUpdateData = {
          paymentDetails: {
            paymentIntentId: paymentIntentId,
            amount: amount,
            currency: currency,
            status: status,
            updatedAt: new Date(),
          },
        };

        subscriptionDetails = await SubscriptionDetails.findByIdAndUpdate(
          subscriptionDetails._id,
          subscriptionUpdateData,
          { new: true }
        );

        console.log(
          "✅ [STATUS_UPDATE_LISTENER] Payment information recorded in subscription details:",
          {
            subscriptionId: subscriptionDetails._id,
            paymentIntentId:
              subscriptionDetails.paymentDetails?.paymentIntentId,
            amount: subscriptionDetails.paymentDetails?.amount,
            currency: subscriptionDetails.paymentDetails?.currency,
          }
        );
      } else {
        // Create subscription details if they don't exist
        console.log(
          "⚠️ [STATUS_UPDATE_LISTENER] Subscription details not found, creating with payment information"
        );

        subscriptionDetails = await SubscriptionDetails.create({
          ApplicationId: applicationId,
          userId: personalDetails.userId,
          paymentDetails: {
            paymentIntentId: paymentIntentId,
            amount: amount,
            currency: currency,
            status: status,
            updatedAt: new Date(),
          },
          subscriptionDetails: {
            // Defaults will be applied from schema
          },
          meta: {
            createdBy: personalDetails.userId,
            userType: "PORTAL",
          },
        });

        console.log(
          "✅ [STATUS_UPDATE_LISTENER] Subscription details created with payment information"
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
