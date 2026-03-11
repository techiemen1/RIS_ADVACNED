// services/formFService.js
const dayjs = require('dayjs');

exports.generateFormFHTML = (data) => {
    const {
        patient,
        doctor,
        husband_name,
        address,
        lmp_date,
        edd_date,
        gestational_age,
        indication_for_scan,
        procedure_type,
        no_of_children_male,
        no_of_children_female,
        patient_declaration_accepted,
        doctor_declaration_accepted,
        generated_at
    } = data;

    const logoUrl = "https://via.placeholder.com/150x50?text=Clinic+Logo"; // Replace with actual logo URL or Base64

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>FORM F</title>
        <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; font-size: 12pt; line-height: 1.4; }
            .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 5px; vertical-align: top; }
            .label { font-weight: bold; width: 300px; }
            .value { border-bottom: 1px dotted #000; padding-left: 5px; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .signature-box { width: 45%; text-align: center; margin-top: 40px; }
            .signature-img { max-height: 60px; display: block; margin: 0 auto; }
            .disclaimer { font-size: 10pt; font-style: italic; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h3>FORM F</h3>
            <p>[See Proviso to Section 4(3), Rule 9(4) and Rule 10(1A)]</p>
            <p>FORM FOR MAINTENANCE OF RECORD IN CASE OF PRENATAL DIAGNOSTIC TEST/PROCEDURE BY GENETIC CLINIC/ULTRASOUND CLINIC/IMAGING CENTRE</p>
        </div>

        <table>
            <tr>
                <td class="label">1. Name and address of the Startling Genetic Clinic/Ultrasound Clinic/Imaging Centre:</td>
                <td class="value">
                    <strong>MERCURY HOSPITALS</strong><br/>
                    123, Medical Hub, Bangalore, Karnataka<br/>
                    Reg. No: KA/BANG/12345/2024
                </td>
            </tr>
            <tr>
                <td class="label">2. Name of Applicant/Patient:</td>
                <td class="value">${patient.name}</td>
            </tr>
            <tr>
                <td class="label">3. Age:</td>
                <td class="value">${patient.age} Yrs</td>
            </tr>
            <tr>
                <td class="label">4. Husband's/Father's Name:</td>
                <td class="value">${husband_name} (Husband)</td>
            </tr>
            <tr>
                <td class="label">5. Full Address with Contact No:</td>
                <td class="value">${address || patient.address}<br/>Ph: ${patient.phone}</td>
            </tr>
            <tr>
                <td class="label">6. Referred By (Doctor/Self):</td>
                <td class="value">${patient.referring_physician || 'Self'}</td>
            </tr>
            <tr>
                <td class="label">7. Last Menstrual Period (LMP):</td>
                <td class="value">${dayjs(lmp_date).format('DD-MMM-YYYY')}</td>
            </tr>
            <tr>
                <td class="label">8. Number of Children:</td>
                <td class="value">Male: ${no_of_children_male || 0} &nbsp;&nbsp;&nbsp; Female: ${no_of_children_female || 0}</td>
            </tr>
        </table>

        <div class="section-title">9. Indication for Test/Procedure (Section 4(2)):</div>
        <div style="padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
            ${indication_for_scan.replace(/\n/g, '<br/>')}
        </div>

        <table>
            <tr>
                <td class="label">10. Procedure Carried Out:</td>
                <td class="value">${procedure_type}</td>
            </tr>
            <tr>
                <td class="label">11. Date of Procedure:</td>
                <td class="value">${dayjs(generated_at).format('DD-MMM-YYYY HH:mm')}</td>
            </tr>
            <tr>
                <td class="label">12. Result of the Procedure:</td>
                <td class="value">Report Attached separately / Stored in PACS</td>
            </tr>
        </table>

        <div class="section-title">DECLARATION OF PREGNANT WOMAN</div>
        <p>I, <strong>${patient.name}</strong>, declare that by undergoing this prenatal diagnostic test/procedure, I do not want to know the sex of my fetus.</p>
        <p>Date: ${dayjs(generated_at).format('DD-MMM-YYYY')}</p>
        <div class="signature-box" style="text-align:left;">
            ${patient_declaration_accepted ? '<img src="' + (data.patient_signature || '') + '" class="signature-img" />' : ''}
            <br/>(Signature/Thump impression of pregnant woman)
        </div>

        <div class="section-title">DECLARATION OF DOCTOR/PERSON CONDUCTING TEST</div>
        <p>I, <strong>Dr. ${doctor.name}</strong>, declare that while conducting the test/procedure, I have not detected or disclosed the sex of the fetus of the pregnant woman to anybody in any manner.</p>
        <p>Date: ${dayjs(generated_at).format('DD-MMM-YYYY')}</p>
        <div class="signature-box" style="text-align:left;">
            ${doctor_declaration_accepted ? '<img src="' + (data.doctor_signature || '') + '" class="signature-img" />' : ''}
            <br/>(Signature of Doctor/Person conducting test)<br/>
            Reg. No: ${doctor.reg_no || 'KMC-XXXX'}
        </div>

        <div class="disclaimer">
            * Warning: Conducting Pre-Natal Diagnostic Techniques for determination of sex of fetus is a crime.
        </div>
    </body>
    </html>
    `;
};
