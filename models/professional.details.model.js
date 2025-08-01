const mongoose = require("mongoose");

const ProfessionalSchema = new mongoose.Schema(
  {
    ApplicationId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Azure B2C ID
    professionalDetails: {
      membershipCategory: { type: String },
      workLocation: { type: String },
      otherWorkLocation: { type: String },
      grade: { type: String },
      otherGrade: { type: String },
      nmbiNumber: { type: String },
      nurseType: { type: String },
      nursingAdaptationProgramme: { type: Boolean, default: false },
      region: { type: String },
      branch: { type: String },
      pensionNo: { type: String },
      isRetired: { type: Boolean, default: false },
      retiredDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      studyLocation: { type: String },
      graduationDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
    },

    meta: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      userType: { type: String },
      deleted: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProfessionalDetails", ProfessionalSchema);
