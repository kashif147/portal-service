/**
 * Stored full name: forename + surname (trimmed), space-separated.
 */
function computeFullNameFromPersonalInfo(personalInfo = {}) {
  const parts = [personalInfo.forename, personalInfo.surname]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.join(" ");
}

function stampPersonalInfoFullName(personalInfo) {
  if (!personalInfo || typeof personalInfo !== "object") return;
  personalInfo.fullName = computeFullNameFromPersonalInfo(personalInfo);
}

function applyFullNameToMongooseUpdate(update) {
  if (!update || typeof update !== "object") return;
  const layer =
    update.$set != null && typeof update.$set === "object"
      ? update.$set
      : update;
  stampPersonalInfoFullName(layer.personalInfo);
}

function enrichPersonalInfoFullNameOnDocument(doc) {
  if (!doc || typeof doc !== "object") return;
  const pi = doc.personalInfo;
  if (pi && typeof pi === "object") {
    stampPersonalInfoFullName(pi);
  }
}

function enrichApplicationRowPersonalFullName(row) {
  if (!row?.personalDetails) return;
  const pi = row.personalDetails.personalInfo;
  if (pi && typeof pi === "object") {
    stampPersonalInfoFullName(pi);
  }
}

module.exports = {
  computeFullNameFromPersonalInfo,
  stampPersonalInfoFullName,
  applyFullNameToMongooseUpdate,
  enrichPersonalInfoFullNameOnDocument,
  enrichApplicationRowPersonalFullName,
};
