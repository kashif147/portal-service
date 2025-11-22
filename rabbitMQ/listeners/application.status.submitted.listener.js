const { publishDomainEvent } = require("../utils/eventPublisher.js");
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

      // Only process events when payment is successfully captured
      // Status should be "paid" or similar successful payment status
      const PAYMENT_CAPTURED_STATUSES = ["paid", "succeeded", "completed"];
      const isPaymentCaptured = PAYMENT_CAPTURED_STATUSES.includes(
        status?.toLowerCase()
      );

      if (!isPaymentCaptured) {
        console.log(
          "ℹ️ [STATUS_UPDATE_LISTENER] Payment not yet captured, skipping event publication:",
          {
            applicationId,
            status,
            expectedStatuses: PAYMENT_CAPTURED_STATUSES,
          }
        );
        return; // Don't publish event until payment is captured
      }

      // Validate required payment data for captured payments
      const hasPaymentInfo = paymentIntentId && amount && currency;
      if (!hasPaymentInfo) {
        console.warn(
          "⚠️ [STATUS_UPDATE_LISTENER] Payment marked as captured but missing payment information:",
          {
            applicationId,
            status,
            hasPaymentIntentId: !!paymentIntentId,
            hasAmount: !!amount,
            hasCurrency: !!currency,
          }
        );
        // Still continue - might be a non-payment flow (e.g., Undergraduate Student)
      }

      // 1. Find application with ID
      const personalDetails = await PersonalDetails.findOne({
        applicationId: applicationId,
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
        applicationId: personalDetails.applicationId,
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
      // First, query for existing subscription details
      let subscriptionDetails = await SubscriptionDetails.findOne({
        applicationId: applicationId,
      });

      if (!subscriptionDetails) {
        console.error(
          "❌ [STATUS_UPDATE_LISTENER] Subscription details not found in database for application:",
          {
            applicationId,
            userId: personalDetails.userId,
          }
        );
        throw new Error(
          `Subscription details must exist before payment capture. Application ID: ${applicationId}`
        );
      }

      console.log(
        "✅ [STATUS_UPDATE_LISTENER] Found subscription details in database:",
        {
          subscriptionId: subscriptionDetails._id,
          applicationId: subscriptionDetails.applicationId,
        }
      );

      // Update payment details if payment information is provided
      if (hasPaymentInfo) {
        console.log(
          "📝 [STATUS_UPDATE_LISTENER] Updating subscription details with payment information:",
          {
            subscriptionId: subscriptionDetails._id,
            applicationId: subscriptionDetails.applicationId,
            paymentIntentId,
            amount,
            currency,
            status,
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

        await SubscriptionDetails.findByIdAndUpdate(
          subscriptionDetails._id,
          subscriptionUpdateData,
          { new: true }
        );

        // Re-query to ensure we have the latest data from database
        const subscriptionId = subscriptionDetails._id;
        subscriptionDetails = await SubscriptionDetails.findById(
          subscriptionId
        );

        if (!subscriptionDetails) {
          console.error(
            "❌ [STATUS_UPDATE_LISTENER] Failed to retrieve subscription details after update:",
            {
              subscriptionId: subscriptionId.toString(),
              applicationId,
            }
          );
          throw new Error(
            `Failed to retrieve subscription details after payment update. Application ID: ${applicationId}`
          );
        }

        console.log(
          "✅ [STATUS_UPDATE_LISTENER] Payment information recorded in subscription details:",
          {
            subscriptionId: subscriptionDetails._id,
            paymentIntentId:
              subscriptionDetails.paymentDetails?.paymentIntentId,
            amount: subscriptionDetails.paymentDetails?.amount,
            currency: subscriptionDetails.paymentDetails?.currency,
            status: subscriptionDetails.paymentDetails?.status,
          }
        );
      } else {
        console.log(
          "ℹ️ [STATUS_UPDATE_LISTENER] No payment information provided (e.g., Undergraduate Student), using existing subscription details"
        );
      }

      // 4. Get all related data for profile service event
      const professionalDetails = await ProfessionalDetails.findOne({
        applicationId: applicationId,
      });

      // Final verification: Re-query subscriptionDetails from database to ensure we have the latest data
      subscriptionDetails = await SubscriptionDetails.findOne({
        applicationId: applicationId,
      });

      if (!subscriptionDetails) {
        console.error(
          "❌ [STATUS_UPDATE_LISTENER] Subscription details not found in database - cannot publish event:",
          {
            applicationId,
            userId: personalDetails.userId,
          }
        );
        throw new Error(
          `Subscription details must exist in database before publishing profile service event. Application ID: ${applicationId}`
        );
      }

      console.log(
        "✅ [STATUS_UPDATE_LISTENER] Verified subscription details from database:",
        {
          subscriptionId: subscriptionDetails._id,
          applicationId: subscriptionDetails.applicationId,
          hasPaymentDetails: !!subscriptionDetails.paymentDetails,
        }
      );

      // 5. Emit event to profile service with all schema details
      const eventPayload = {
        applicationId: applicationId,
        tenantId: tenantId,
        status: status,
        personalDetails: updatedPersonalDetails,
        professionalDetails: professionalDetails,
        subscriptionDetails: subscriptionDetails, // paymentDetails already included here
      };

      console.log(
        "📤 [STATUS_UPDATE_LISTENER] Emitting profile service event:",
        {
          applicationId: eventPayload.applicationId,
          status: eventPayload.status,
          hasPersonalDetails: !!eventPayload.personalDetails,
          hasProfessionalDetails: !!eventPayload.professionalDetails,
          hasSubscriptionDetails: !!eventPayload.subscriptionDetails,
          subscriptionDetailsId:
            eventPayload.subscriptionDetails?._id?.toString(),
          subscriptionDetailsApplicationId:
            eventPayload.subscriptionDetails?.applicationId,
          hasPaymentDetails: !!eventPayload.subscriptionDetails?.paymentDetails,
        }
      );

      await publishDomainEvent(PROFILE_EVENTS.APPLICATION_CREATE, eventPayload);

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
