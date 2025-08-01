const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ProfileSchema = new mongoose.Schema(
  {
    ApplicationId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: false, default: null }, // Azure B2C ID
    personalInfo: {
      title: { type: String },
      surname: { type: String },
      forename: { type: String },
      gender: { type: String },
      dateOfBirth: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      age: Number, //calculated via backend
      countryPrimaryQualification: { type: String },
      deceased: { type: Boolean, default: false },
      deceasedDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
    },
    contactInfo: {
      preferredAddress: { type: String, enum: ["home", "work"], default: "home" },
      eircode: String,
      buildingOrHouse: { type: String },
      streetOrRoad: String,
      areaOrTown: String,
      countyCityOrPostCode: { type: String },
      country: String,
      fullAddress: String, //calculated via backend
      mobileNumber: String,
      telephoneNumber: String,
      preferredEmail: { type: String, enum: ["personal", "work"], default: "personal" },
      personalEmail: String,
      workEmail: String,
      consentSMS: Boolean,
      consentEmail: Boolean,
    },

    // Application status for approval workflow
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvalDetails: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      approvedAt: Date,
      rejectionReason: String,
      comments: String,
    },

    meta: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      userType: { type: String, enum: ["PORTAL", "CRM"], default: "PORTAL" },
      deleted: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("personalDetails", ProfileSchema);
