const { PAYMENT_TYPE, PAYMENT_FREQUENCY } = require("../constants/enums");

function normalizeCategoryKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isNoFeeMembershipCategory(membershipCategory) {
  const key = normalizeCategoryKey(membershipCategory);
  if (!key) return false;
  if (key === "honorary" || /\bhonorary\b/.test(key)) return true;
  return (
    key.includes("undergraduate") &&
    key.includes("student") &&
    !key.includes("postgraduate")
  );
}

function hasPaymentTypeValue(paymentType) {
  return String(paymentType ?? "").trim() !== "";
}

function hasPaymentFrequencyValue(paymentFrequency) {
  return String(paymentFrequency ?? "").trim() !== "";
}

function applyNoFeeMembershipPaymentDefaults(subscriptionDetails = {}) {
  if (!subscriptionDetails || typeof subscriptionDetails !== "object") {
    return subscriptionDetails;
  }

  if (!isNoFeeMembershipCategory(subscriptionDetails.membershipCategory)) {
    return subscriptionDetails;
  }

  return {
    ...subscriptionDetails,
    paymentType: PAYMENT_TYPE.CASH,
    paymentFrequency: PAYMENT_FREQUENCY.ANNUALLY,
    payrollNo: null,
  };
}

module.exports = {
  isNoFeeMembershipCategory,
  applyNoFeeMembershipPaymentDefaults,
  hasPaymentTypeValue,
  hasPaymentFrequencyValue,
};
