const mongoose = require("mongoose");

const ProfessionalSchema = new mongoose.Schema(
  {
    // Owning tenant. Always stamped from the trusted auth context (or the
    // event envelope for listener-created rows); never from body/query.
    tenantId: { type: String, required: true, trim: true },
    applicationId: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: false,
      default: null,
    }, // Azure B2C ID
    professionalDetails: {
      membershipCategory: { type: String, allowNull: true },
      workLocation: { type: String, allowNull: true },
      otherWorkLocation: { type: String, allowNull: true },
      grade: { type: String, allowNull: true },
      otherGrade: { type: String, allowNull: true },
      nmbiNumber: { type: String, allowNull: true },
      nurseType: { type: String, allowNull: true },
      nursingAdaptationProgramme: { type: Boolean, default: false },
      region: { type: String, allowNull: true },
      branch: { type: String, allowNull: true },
      pensionNo: { type: String, allowNull: true },
      isRetired: { type: Boolean, default: false },
      retiredDate: { type: Date, allowNull: true },
      studyLocation: { type: String, allowNull: true },
      startDate: { type: Date, allowNull: true },
      graduationDate: { type: Date, allowNull: true },
      discipline: { type: String, allowNull: true },
      previousMembershipNo: { type: String, allowNull: true },
      joinYouthForum: { type: Boolean, default: null },
      youthForum: { type: String, allowNull: true },
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

// Tenant-leading compound indexes back every tenant-scoped lookup. The legacy
// single-field index stays until the tenantId backfill has run everywhere
// (see scripts/migrations/README-tenantId-backfill.md).
ProfessionalSchema.index({ tenantId: 1, applicationId: 1 });
ProfessionalSchema.index({ tenantId: 1, userId: 1 });
ProfessionalSchema.index({ applicationId: 1 });

module.exports = mongoose.model("ProfessionalDetails", ProfessionalSchema);
