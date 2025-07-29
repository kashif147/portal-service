const mongoose = require("mongoose");

const ProfessionalSchema = new mongoose.Schema(
  {
    // profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
    professionalDetails: {
      workLocation: { type: String },
      otherWorkLocation: { type: String },
      grade: { type: String },
      otherGrade: { type: String },
      primarySection: String,
      secondarySection: String,
      otherSection: String,
      nursingAdaptationProgramme: { type: Boolean, default: false },
      region: { type: String },
      branch: { type: String },
      pensionNo: { type: String },
      isRetired: { type: Boolean, default: false },
      retiredDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      studyLocation: { type: String },
      graduationDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
      otherGraduationDate: { type: String, match: /^\d{2}\/\d{2}\/\d{4}$/ },
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

module.exports = mongoose.model("ProfessionalDetails", ProfessionalSchema);
