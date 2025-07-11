const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    // profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },

    subscriptionProduct: { type: String, required: true },
    membershipNo: { type: String, required: true },
    membershipCategory: { type: String, required: true },
    dateJoined: { type: String, required: true, match: /^\d{2}\/\d{2}\/\d{4}$/ },
    dateLeft: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
    reasonLeft: String,
    paymentType: {
      type: String,
      enum: ["Payroll Deduction", "Direct Debit", "Card Payment"],
      default: "Payroll Deduction",
    },
    paymentFrequency: { type: String, enum: ["Monthly", "Quarterly", "Annually"], default: "Monthly" },
    payrollNo: String,

    meta: {
      createdAt: { type: String, default: () => new Date().toLocaleDateString("en-GB") },
      updatedAt: { type: String },
      //   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      //   updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      deleted: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model("subscriptionDetails", SubscriptionSchema);
