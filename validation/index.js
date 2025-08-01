const Joi = require("joi");

module.exports.create = Joi.object({
  personalInfo: Joi.object({
    title: Joi.string().optional(),
    surname: Joi.string().optional(),
    forename: Joi.string().optional(),
    gender: Joi.string().optional(),
    dateOfBirth: Joi.string().optional(),
    countryPrimaryQualification: Joi.string().optional(),
  }).optional(),
  contactInfo: Joi.object({
    preferredAddress: Joi.string().optional(),
    eircode: Joi.string().optional(),
    buildingOrHouse: Joi.string().optional(),
    streetOrRoad: Joi.string().optional(),
    areaOrTown: Joi.string().optional(),
    countyCityOrPostCode: Joi.string().optional(),
    country: Joi.string().optional(),
    mobileNumber: Joi.string().optional(),
    telephoneNumber: Joi.string().optional(),
    preferredEmail: Joi.string().optional(),
    personalEmail: Joi.string().optional(),
    workEmail: Joi.string().optional(),
    consentSMS: Joi.boolean().optional(),
    consentEmail: Joi.boolean().optional(),
  }).optional(),
});
