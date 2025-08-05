const mongoose = require("mongoose");
const { PAYMENT_TYPE, PAYMENT_FREQUENCY, USER_TYPE } = require("../constants/enums");

const SubscriptionSchema = new mongoose.Schema(
  {
    ApplicationId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: false, default: null }, // Azure B2C ID
    membershipNumber: { type: String, unique: true, sparse: true }, // Auto-generated membership number

    subscriptionDetails: {
      paymentType: {
        type: String,
        enum: Object.values(PAYMENT_TYPE),
        default: PAYMENT_TYPE.PAYROLL_DEDUCTION,
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
      paymentFrequency: { type: String, enum: Object.values(PAYMENT_FREQUENCY), default: PAYMENT_FREQUENCY.MONTHLY },
      valueAddedServices: { type: Boolean, default: false },
      termsAndConditions: { type: Boolean, default: true },
      membershipCategory: { type: String },
      dateJoined: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
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
      userType: { type: String, enum: Object.values(USER_TYPE) },
      deleted: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("subscriptionDetails", SubscriptionSchema);
