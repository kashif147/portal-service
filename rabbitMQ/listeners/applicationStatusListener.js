const { subscribeToEvent } = require("message-bus");
const PersonalDetails = require("../models/personal.details.model");
const {
  emitApplicationStatusUpdated,
  emitApplicationApproved,
} = require("../events/userInformationEvents");

class ApplicationStatusListener {
  constructor() {
    this.initializeListeners();
  }

  async initializeListeners() {
    try {
      // Listen for application approval/rejection from Config Service
      await subscribeToEvent(
        "application.approvalRequest",
        this.handleApplicationApproval.bind(this)
      );

      console.log("✅ Application Status Listener initialized successfully");
    } catch (error) {
      console.error(
        "❌ Error initializing Application Status Listener:",
        error.message
      );
    }
  }

  async handleApplicationApproval(data) {
    try {
      console.log("📥 Received application approval request:", data);

      const {
        personalDetailsId,
        status,
        approvedBy,
        comments,
        rejectionReason,
      } = data;

      // Find the personal details record
      const personalDetails = await PersonalDetails.findById(personalDetailsId);
      if (!personalDetails) {
        console.error(
          "❌ Personal details not found for ID:",
          personalDetailsId
        );
        return;
      }

      // Update application status
      const updateData = {
        applicationStatus: status,
        approvalDetails: {
          approvedBy: approvedBy,
          approvedAt: new Date(),
          comments: comments,
          rejectionReason: rejectionReason,
        },
      };

      const updatedPersonalDetails = await PersonalDetails.findByIdAndUpdate(
        personalDetailsId,
        updateData,
        { new: true }
      );

      console.log("✅ Application status updated to:", status);

      // Emit status updated event
      await emitApplicationStatusUpdated({
        personalDetailsId: personalDetailsId,
        userId: personalDetails.userId,
        applicationStatus: status,
        approvalDetails: updateData.approvalDetails,
      });

      // If approved, emit approval event with subscription details
      if (status === "approved") {
        // Get subscription details for the approved application
        const SubscriptionDetails = require("../models/subscription.model");
        const subscriptionDetails = await SubscriptionDetails.findOne({
          profileId: personalDetailsId,
        });

        await emitApplicationApproved({
          personalDetailsId: personalDetailsId,
          userId: personalDetails.userId,
          subscriptionDetails: subscriptionDetails,
          approvalDetails: updateData.approvalDetails,
        });
      }
    } catch (error) {
      console.error("❌ Error handling application approval:", error.message);
    }
  }
}

module.exports = new ApplicationStatusListener();
