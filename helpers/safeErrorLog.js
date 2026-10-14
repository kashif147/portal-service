/**
 * Loggable fields of an error: name, code and - for validation/database errors - field names
 * only (Joi details[].path, Mongoose Object.keys(errors), duplicate key Object.keys(keyPattern)).
 * error.message, keyValue and the error object itself are never logged: Mongoose and duplicate-key
 * errors embed the rejected values (email, names, dates of birth...).
 */
function safeErrorFields(error) {
  const fields = { name: error?.name || null, code: error?.code ?? null };
  if (error?.isJoi && Array.isArray(error.details)) {
    fields.fields = error.details.map((d) => (Array.isArray(d.path) ? d.path.join(".") : String(d.path)));
  } else if (error?.name === "ValidationError" && error.errors && typeof error.errors === "object") {
    fields.fields = Object.keys(error.errors);
  } else if (error?.code === 11000) {
    fields.fields = Object.keys(error.keyPattern || {});
  }
  return fields;
}

module.exports = { safeErrorFields };
