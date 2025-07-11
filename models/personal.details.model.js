const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    eircode: String,
    buildingOrHouse: { type: String, required: true },
    streetOrRoad: String,
    areaOrTown: String,
    countyCityOrPostCode: { type: String, required: true },
    country: String,
    // country: { type: mongoose.Schema.Types.ObjectId, ref: "lookups" },
    fullAddress: String,
  },
  { _id: false }
);

const ProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Azure B2C ID

    personalInfo: {
      //   title: { type: mongoose.Schema.Types.ObjectId, ref: "lookups", required: true },
      title: { type: String, required: true },
      surname: { type: String, required: true },
      forename: { type: String, required: true },
      gender: { type: String, required: true },
      //   gender: { type: mongoose.Schema.Types.ObjectId, ref: "lookups", required: true },
      dateOfBirth: { type: String, required: true, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      age: Number, //calculated
      countryPrimaryQualification: { type: String, required: true },
      //   countryPrimaryQualification: { type: mongoose.Schema.Types.ObjectId, ref: "lookups" },
      deceased: { type: Boolean, default: false },
      deceasedDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
    },

    contactInfo: {
      preferredAddress: { type: String, enum: ["home", "work"], default: "home" },
      homeAddress: { type: AddressSchema, required: true },
      workAddress: AddressSchema,
      preferredEmail: { type: String, enum: ["work", "personal"], default: "work" },
      emailWork: {
        type: String,
        required: function () {
          return !this.emailPersonal;
        },
      },
      emailPersonal: String,
      mobile: { type: String, required: true },
      consentSMS: Boolean,
      consentEmail: Boolean,
    },

    nursingDetails: {
      nmbiNo: String,
      nursingTypes: [String], // checkbox multiple
      rejoiningOption: String,
      isMemberOtherUnion: Boolean,
      hasIncomeProtectionOtherUnion: Boolean,
    },

    recruitment: {
      recruitedBy: String,
      recruitedByMembershipNo: String,
    },

    extras: {
      incomeProtectionScheme: Boolean,
      inmoRewards: Boolean,
      valueAddedServices: Boolean,
      termsAccepted: { type: Boolean, required: true },
    },

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

module.exports = mongoose.model("personalDetails", ProfileSchema);
