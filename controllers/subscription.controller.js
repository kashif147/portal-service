const subscriptionService = require("../services/subscription.service");

class SubscriptionController {
  // Create new subscription
  async createSubscription(req, res) {
    try {
      const subscription = await subscriptionService.createSubscription(req.body);

      return res.status(201).json({
        success: true,
        message: "Subscription created successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Create Subscription Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to create subscription",
        error: error.message,
      });
    }
  }

  // Get subscription by ID
  async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getSubscriptionById(id);

      return res.status(200).json({
        success: true,
        message: "Subscription retrieved successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Get Subscription Error:", error);
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
        error: error.message,
      });
    }
  }

  // Get subscription by profile ID
  async getSubscriptionByProfileId(req, res) {
    try {
      const { profileId } = req.params;
      const subscription = await subscriptionService.getSubscriptionByProfileId(profileId);

      return res.status(200).json({
        success: true,
        message: "Subscription retrieved successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Get Subscription by Profile ID Error:", error);
      return res.status(404).json({
        success: false,
        message: "Subscription not found for this profile",
        error: error.message,
      });
    }
  }

  // Get all subscriptions with pagination and filters
  async getAllSubscriptions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        subscriptionProduct,
        membershipCategory,
        paymentType,
        paymentFrequency,
        dateJoined,
      } = req.query;
      const filters = { subscriptionProduct, membershipCategory, paymentType, paymentFrequency, dateJoined };

      const result = await subscriptionService.getAllSubscriptions(parseInt(page), parseInt(limit), filters);

      return res.status(200).json({
        success: true,
        message: "Subscriptions retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Get All Subscriptions Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve subscriptions",
        error: error.message,
      });
    }
  }

  // Update subscription
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.updateSubscription(id, req.body);

      return res.status(200).json({
        success: true,
        message: "Subscription updated successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Update Subscription Error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to update subscription",
        error: error.message,
      });
    }
  }

  // Soft delete subscription
  async deleteSubscription(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.deleteSubscription(id);

      return res.status(200).json({
        success: true,
        message: "Subscription deleted successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Delete Subscription Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete subscription",
        error: error.message,
      });
    }
  }

  // Restore subscription
  async restoreSubscription(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.restoreSubscription(id);

      return res.status(200).json({
        success: true,
        message: "Subscription restored successfully",
        data: subscription,
      });
    } catch (error) {
      console.error("Restore Subscription Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to restore subscription",
        error: error.message,
      });
    }
  }

  // Hard delete subscription
  async hardDeleteSubscription(req, res) {
    try {
      const { id } = req.params;
      const result = await subscriptionService.hardDeleteSubscription(id);

      return res.status(200).json({
        success: true,
        message: "Subscription permanently deleted",
        data: result,
      });
    } catch (error) {
      console.error("Hard Delete Subscription Error:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to delete subscription",
        error: error.message,
      });
    }
  }

  // Get active subscriptions
  async getActiveSubscriptions(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await subscriptionService.getActiveSubscriptions(parseInt(page), parseInt(limit));

      return res.status(200).json({
        success: true,
        message: "Active subscriptions retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Get Active Subscriptions Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve active subscriptions",
        error: error.message,
      });
    }
  }

  // Get inactive subscriptions
  async getInactiveSubscriptions(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await subscriptionService.getInactiveSubscriptions(parseInt(page), parseInt(limit));

      return res.status(200).json({
        success: true,
        message: "Inactive subscriptions retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Get Inactive Subscriptions Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve inactive subscriptions",
        error: error.message,
      });
    }
  }
}

module.exports = new SubscriptionController();
