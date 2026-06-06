const mongoose = require("mongoose");
const { PAYMENT_TYPE } = require("../constants/enums");
const { AppError } = require("../errors/AppError");
const {
  getLookupUserDbConnection,
  getLookupModels,
} = require("./lookupUserDb");

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isWorkLocationLookupType = (lookupTypeDoc) => {
  if (!lookupTypeDoc) return false;
  const typeName = normalizeKey(lookupTypeDoc.lookuptype).replace(/\s+/g, "");
  const code = normalizeKey(lookupTypeDoc.code);
  return typeName === "worklocation" || code === "workloc";
};

async function getUserServiceLookupModels() {
  const connection = await getLookupUserDbConnection();
  return getLookupModels(connection);
}

async function resolveWorkLocationProcessSalaryDeduction(workLocationLabel) {
  const labelKey = normalizeKey(workLocationLabel);
  if (!labelKey || labelKey === "other") return false;

  const { Lookup, LookupType } = await getUserServiceLookupModels();

  if (
    mongoose.Types.ObjectId.isValid(workLocationLabel) &&
    String(workLocationLabel).length === 24
  ) {
    const byId = await Lookup.findOne({
      _id: workLocationLabel,
      isdeleted: { $ne: true },
      isactive: { $ne: false },
    })
      .select("processSalaryDeduction lookuptypeId")
      .lean();

    if (byId?.lookuptypeId) {
      const typeDoc = await LookupType.findById(byId.lookuptypeId)
        .select("lookuptype code")
        .lean();
      if (isWorkLocationLookupType(typeDoc)) {
        return !!byId.processSalaryDeduction;
      }
    }
  }

  const escaped = String(workLocationLabel).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const namePattern = new RegExp(`^${escaped}$`, "i");
  const candidates = await Lookup.find({
    isdeleted: { $ne: true },
    isactive: { $ne: false },
    $or: [{ lookupname: namePattern }, { DisplayName: namePattern }],
  })
    .select("lookupname DisplayName processSalaryDeduction lookuptypeId")
    .lean();

  const typeIds = [
    ...new Set(
      candidates.map((row) => String(row.lookuptypeId)).filter(Boolean),
    ),
  ];
  const types = typeIds.length
    ? await LookupType.find({ _id: { $in: typeIds } })
        .select("lookuptype code")
        .lean()
    : [];
  const typeById = new Map(types.map((row) => [String(row._id), row]));

  const match = candidates.find((row) => {
    const typeDoc = typeById.get(String(row.lookuptypeId));
    if (!isWorkLocationLookupType(typeDoc)) return false;
    const names = [row.lookupname, row.DisplayName]
      .filter(Boolean)
      .map(normalizeKey);
    return names.includes(labelKey);
  });

  return !!match?.processSalaryDeduction;
}

function isSalaryDeductionPaymentType(paymentType) {
  const key = normalizeKey(paymentType);
  return (
    paymentType === PAYMENT_TYPE.PAYROLL_DEDUCTION || key === "salary deduction"
  );
}

async function assertSalaryDeductionAllowedForWorkLocation(
  subscriptionDetails,
  workLocation,
) {
  if (
    !subscriptionDetails ||
    !isSalaryDeductionPaymentType(subscriptionDetails.paymentType)
  ) {
    return;
  }

  const allows = await resolveWorkLocationProcessSalaryDeduction(workLocation);
  if (!allows) {
    throw AppError.badRequest(
      "Salary Deduction is not available for the selected work location",
    );
  }
}

module.exports = {
  resolveWorkLocationProcessSalaryDeduction,
  assertSalaryDeductionAllowedForWorkLocation,
};
