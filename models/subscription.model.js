const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    ApplicationId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Azure B2C ID

    subscriptionDetails: {
      paymentType: {
        type: String,
        enum: ["Payroll Deduction", "Direct Debit", "Card Payment"],
        default: "Payroll Deduction",
      },
      payrollNo: String,
      membershipStatus: { type: String },
      otherIrishTradeUnion: { type: Boolean, default: false },
      otherScheme: { type: Boolean, default: false },
      recuritedBy: { type: String },
      recuritedByMembershipNo: { type: String },
      primarySection: { type: String },
      otherPrimarySection: { type: String },
      secondarySection: { type: String },
      otherSecondarySection: { type: String },
      incomeProtectionScheme: { type: Boolean, default: false },
      inmoRewards: { type: Boolean, default: false },
      paymentFrequency: { type: String, enum: ["Monthly", "Quarterly", "Annually"], default: "Monthly" },
      valueAddedServices: { type: Boolean, default: false },
      termsAndConditions: { type: Boolean, default: true },
      membershipCategory: { type: String, required: true },
      dateJoined: { type: String, required: true, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      dateLeft: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      reasonLeft: String,
    },

    // // Professional details that will be synced from professional details
    // professionalDetails: {
    //   membershipCategory: { type: String },
    //   workLocation: { type: String },
    //   otherWorkLocation: { type: String },
    //   region: { type: String },
    //   branch: { type: String },
    // },

    meta: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      deleted: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("subscriptionDetails", SubscriptionSchema);
