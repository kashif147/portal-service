const Subscription = require("../models/subscription.model");

class SubscriptionService {
  // Create new subscription
  async createSubscription(data) {
    try {
      // Set creation timestamp
      if (data.meta) {
        data.meta.createdAt = new Date().toLocaleDateString("en-GB");
      }

      const subscription = new Subscription(data);
      return await subscription.save();
    } catch (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }
  }

  // Get subscription by ID
  async getSubscriptionById(id) {
    try {
      const subscription = await Subscription.findById(id);

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  // Get subscription by profile ID
  async getSubscriptionByProfileId(profileId) {
    try {
      const subscription = await Subscription.findOne({ profileId });

      if (!subscription) {
        throw new Error("Subscription not found for this profile");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  // Get subscription by user ID
  async getSubscriptionByUserId(userId) {
    try {
      const subscription = await Subscription.findOne({ userId });

      if (!subscription) {
        throw new Error("Subscription not found for this user");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  // Get subscription by membership number
  async getSubscriptionByMembershipNo(membershipNo) {
    try {
      const subscription = await Subscription.findOne({ membershipNo });

      if (!subscription) {
        throw new Error("Subscription not found for this membership number");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  // Get all subscriptions (with pagination)
  async getAllSubscriptions(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { "meta.deleted": false, "meta.isActive": true };

      // Add filters
      if (filters.paymentType) query.paymentType = filters.paymentType;
      if (filters.membershipCategory) query.membershipCategory = filters.membershipCategory;
      if (filters.membershipNo) query.membershipNo = filters.membershipNo;
      if (filters.payrollNo) query.payrollNo = filters.payrollNo;
      if (filters.dateJoined) query.dateJoined = filters.dateJoined;
      if (filters.dateLeft) query.dateLeft = filters.dateLeft;

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching subscriptions: ${error.message}`);
    }
  }

  // Update subscription
  async updateSubscription(id, updateData) {
    try {
      // Set update timestamp
      if (updateData.meta) {
        updateData.meta.updatedAt = new Date().toLocaleDateString("en-GB");
      } else {
        updateData.meta = { updatedAt: new Date().toLocaleDateString("en-GB") };
      }

      const subscription = await Subscription.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error updating subscription: ${error.message}`);
    }
  }

  // Soft delete subscription
  async deleteSubscription(id) {
    try {
      const subscription = await Subscription.findByIdAndUpdate(
        id,
        {
          "meta.deleted": true,
          "meta.isActive": false,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error deleting subscription: ${error.message}`);
    }
  }

  // Restore subscription
  async restoreSubscription(id) {
    try {
      const subscription = await Subscription.findByIdAndUpdate(
        id,
        {
          "meta.deleted": false,
          "meta.isActive": true,
          "meta.updatedAt": new Date().toLocaleDateString("en-GB"),
        },
        { new: true }
      );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error restoring subscription: ${error.message}`);
    }
  }

  // Hard delete subscription
  async hardDeleteSubscription(id) {
    try {
      const subscription = await Subscription.findByIdAndDelete(id);

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return { message: "Subscription permanently deleted" };
    } catch (error) {
      throw new Error(`Error deleting subscription: ${error.message}`);
    }
  }

  // Search subscriptions
  async searchSubscriptions(searchTerm, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        $or: [
          { membershipNo: { $regex: searchTerm, $options: "i" } },
          { membershipCategory: { $regex: searchTerm, $options: "i" } },
          { paymentType: { $regex: searchTerm, $options: "i" } },
          { payrollNo: { $regex: searchTerm, $options: "i" } },
        ],
      };

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error searching subscriptions: ${error.message}`);
    }
  }

  // Get subscriptions by payment type
  async getSubscriptionsByPaymentType(paymentType, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        paymentType: paymentType,
      };

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching subscriptions by payment type: ${error.message}`);
    }
  }

  // Get subscriptions by membership category
  async getSubscriptionsByMembershipCategory(membershipCategory, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        membershipCategory: membershipCategory,
      };

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching subscriptions by membership category: ${error.message}`);
    }
  }

  // Get active subscriptions (no dateLeft)
  async getActiveSubscriptions(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        dateLeft: { $exists: false },
      };

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching active subscriptions: ${error.message}`);
    }
  }

  // Get inactive subscriptions (with dateLeft)
  async getInactiveSubscriptions(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = {
        "meta.deleted": false,
        "meta.isActive": true,
        dateLeft: { $exists: true },
      };

      const subscriptions = await Subscription.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ "meta.createdAt": -1 });

      const total = await Subscription.countDocuments(query);

      return {
        data: subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error fetching inactive subscriptions: ${error.message}`);
    }
  }

  // Get subscription statistics
  async getSubscriptionStatistics() {
    try {
      const totalSubscriptions = await Subscription.countDocuments({
        "meta.deleted": false,
        "meta.isActive": true,
      });

      const activeSubscriptions = await Subscription.countDocuments({
        "meta.deleted": false,
        "meta.isActive": true,
        dateLeft: { $exists: false },
      });

      const inactiveSubscriptions = await Subscription.countDocuments({
        "meta.deleted": false,
        "meta.isActive": true,
        dateLeft: { $exists: true },
      });

      const paymentTypeStats = await Subscription.aggregate([
        {
          $match: {
            "meta.deleted": false,
            "meta.isActive": true,
          },
        },
        {
          $group: {
            _id: "$paymentType",
            count: { $sum: 1 },
          },
        },
      ]);

      const membershipCategoryStats = await Subscription.aggregate([
        {
          $match: {
            "meta.deleted": false,
            "meta.isActive": true,
          },
        },
        {
          $group: {
            _id: "$membershipCategory",
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        totalSubscriptions,
        activeSubscriptions,
        inactiveSubscriptions,
        paymentTypeStats,
        membershipCategoryStats,
      };
    } catch (error) {
      throw new Error(`Error fetching subscription statistics: ${error.message}`);
    }
  }
}

module.exports = new SubscriptionService();
