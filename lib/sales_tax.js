/*
 * node-sales-tax
 *
 * Copyright 2017, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


var __Promise = (
  (typeof Promise !== "undefined") ?
    Promise : require("es6-promise-polyfill").Promise
);

var validate_eu_vat = require("validate-vat");
var country_tax = require("../res/country_tax.json");


/**
 * SalesTax
 * @class
 * @classdesc  Instanciates a new sales tax object
 */
var SalesTax = function() {};


/**
 * SalesTax.prototype.hasSalesTax
 * @public
 * @param  {string}  countryCode
 * @return {boolean} Whether country has any sales tax
 */
SalesTax.prototype.hasSalesTax = function(
  countryCode
) {
  countryCode = (countryCode || "").toUpperCase();

  return country_tax[countryCode] ? true : false;
};


/**
 * SalesTax.prototype.getSalesTax
 * @public
 * @param  {string} countryCode
 * @param  {string} [taxNumber]
 * @return {object} Promise object (returns the sales tax from 0 to 1)
 */
SalesTax.prototype.getSalesTax = function(
  countryCode, taxNumber
) {
  var self = this;

  countryCode = (countryCode || "").toUpperCase();
  taxNumber = (taxNumber || null);

  // Acquire sales tax for country, or default (if no known sales tax)
  var tax = country_tax[countryCode] || {
    type : "none",
    rate : 0.00
  };

  if (tax.rate > 0) {
    return self.isTaxExempt(countryCode, taxNumber)
      .then(function(isExempt) {
        return __Promise.resolve(
          self.__buildSalesTaxContext(tax.type, tax.rate, isExempt)
        );
      });
  }

  return __Promise.resolve(
    self.__buildSalesTaxContext(tax.type, tax.rate, false)
  );
};


/**
 * SalesTax.prototype.getAmountWithSalesTax
 * @public
 * @param  {string} countryCode
 * @param  {number} [amount]
 * @param  {string} [taxNumber]
 * @return {object} Promise object (returns the total tax amount)
 */
SalesTax.prototype.getAmountWithSalesTax = function(
  countryCode, amount, taxNumber
) {
  var self = this;

  amount = (amount || 0.00);
  taxNumber = (taxNumber || null);

  // Acquire sales tax, then process amount.
  return self.getSalesTax(countryCode, taxNumber)
    .then(function(tax) {
      return __Promise.resolve({
        type   : tax.type,
        rate   : tax.rate,
        exempt : tax.exempt,
        price  : amount,
        total  : (1.00 + tax.rate) * amount
      });
    });
};


/**
 * SalesTax.prototype.validateTaxNumber
 * @public
 * @param  {string} countryCode
 * @param  {string} taxNumber
 * @return {object} Promise object (returns a boolean for validity)
 */
SalesTax.prototype.validateTaxNumber = function(
  countryCode, taxNumber
) {
  switch (countryCode) {
    // Europe member states
    case "AT":
    case "BE":
    case "BG":
    case "HR":
    case "CY":
    case "CZ":
    case "DK":
    case "EE":
    case "FI":
    case "FR":
    case "DE":
    case "EL":
    case "HU":
    case "IE":
    case "IT":
    case "LV":
    case "LT":
    case "LU":
    case "MT":
    case "NL":
    case "PL":
    case "PT":
    case "RO":
    case "SK":
    case "SI":
    case "ES":
    case "SE":
    case "GB": {
      return new __Promise(function(resolve, reject) {
        // Validate EU VAT number
        validate_eu_vat(
          countryCode, taxNumber,

          function(error, validationInfo) {
            if (error) {
              return reject(error);
            }

            // Return whether valid or not
            return resolve(validationInfo.valid && true);
          }
        );
      });
    }

    default: {
      // Consider as invalid tax number (tax number country not recognized)
      return __Promise.resolve(false);
    }
  }
};


/**
 * SalesTax.prototype.isTaxExempt
 * @public
 * @param  {string} countryCode
 * @param  {string} taxNumber
 * @return {object} Promise object (returns a boolean for exempt status)
 */
SalesTax.prototype.isTaxExempt = function(
  countryCode, taxNumber
) {
  var self = this;

  // Check for tax-exempt status? (if tax number is provided)
  if (taxNumber) {
    return self.validateTaxNumber(countryCode, taxNumber)
      .then(function(isValid) {
        // Consider valid numbers as tax-exempt
        if (isValid === true) {
          return __Promise.resolve(true);
        }

        return __Promise.resolve(false);
      });
  }

  // Consider as non tax-exempt
  return __Promise.resolve(false);
};


/**
 * SalesTax.prototype.__buildSalesTaxContext
 * @private
 * @param  {string}  taxType
 * @param  {number}  taxRate
 * @param  {boolean} isExempt
 * @return {object}  Sales tax context object
 */
SalesTax.prototype.__buildSalesTaxContext = function(
  taxType, taxRate, isExempt
) {
  return {
    type   : taxType,
    rate   : (isExempt === true) ? 0.00 : taxRate,
    exempt : isExempt
  };
};


module.exports = new SalesTax();