/**
 * simulate UIDAI / NDHM verification
 */

exports.verifyAadhaar = async (aadhaarNumber) => {
    // Simulated checks
    if (!/^\d{12}$/.test(aadhaarNumber)) {
        return { valid: false, message: 'Invalid format: Must be 12 digits' };
    }
    // Mock API call simulation
    return {
        valid: true,
        message: 'Aadhaar Verified (Simulated)',
        details: { masked: `XXXXXXXX${aadhaarNumber.slice(8)}`, kyc_status: 'OK' }
    };
};

exports.verifyPAN = async (pan) => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        return { valid: false, message: 'Invalid PAN format' };
    }
    return { valid: true, message: 'PAN Verified (Simulated)' };
};

exports.verifyHealthId = async (abha) => {
    // Basic check for ABHA Address (phr address) or number
    if (abha.length < 8) return { valid: false, message: 'Invalid ABHA ID length' };
    return { valid: true, message: 'NDHM Health ID Verified (Simulated)' };
};
