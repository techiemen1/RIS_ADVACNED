// services/gstService.js

/**
 * Radiology Services HSN Code: 9993
 * Standard GST Rate for Diagnostic Services: Often exempt or GST at 18% depending on the specific billing entity. 
 * We will default to 18% as specified in the requirements.
 */

const GST_RATE_STANDARD = 0.18; // 18%

/**
 * Calculates GST based on location.
 * @param {number} amount - Taxable amount 
 * @param {string} hospitalState - State of the hospital
 * @param {string} patientState - State of the patient
 * @returns {object} - Breakdown of taxes
 */
const calculateGST = (amount, hospitalState = "", patientState = "") => {
    const isInterState = hospitalState && patientState && hospitalState.toLowerCase() !== patientState.toLowerCase();

    if (isInterState) {
        return {
            type: 'IGST',
            cgst_rate: 0,
            sgst_rate: 0,
            igst_rate: GST_RATE_STANDARD * 100,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: amount * GST_RATE_STANDARD,
            taxable_amount: amount,
            total_amount: amount * (1 + GST_RATE_STANDARD)
        };
    } else {
        return {
            type: 'CGST_SGST',
            cgst_rate: (GST_RATE_STANDARD / 2) * 100,
            sgst_rate: (GST_RATE_STANDARD / 2) * 100,
            igst_rate: 0,
            cgst_amount: amount * (GST_RATE_STANDARD / 2),
            sgst_amount: amount * (GST_RATE_STANDARD / 2),
            igst_amount: 0,
            taxable_amount: amount,
            total_amount: amount * (1 + GST_RATE_STANDARD)
        };
    }
};

module.exports = {
    calculateGST,
    HSN_RADIOLOGY: "9993"
};
