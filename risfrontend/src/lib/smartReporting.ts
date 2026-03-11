export const generateSmartContent = (clinicalData: any, modality: string, bodyPart: string): string | null => {
  if (!clinicalData) return null;

  // 1. OBSTETRIC (Existing)
  // Trigger: Pregnancy Flag + Ultrasound or MRI
  if (clinicalData.isPregnant && (modality === 'US' || modality === 'USG' || modality === 'MR')) {
    const lmpStr = clinicalData.lmp ? new Date(clinicalData.lmp).toLocaleDateString() : 'Unknown';
    const husband = clinicalData.husbandName || '________';

    return `
      <h3>OBSTETRIC ULTRASOUND</h3>
      <p><strong>Clinical History:</strong> Amenorrhea since ${lmpStr}. ${clinicalData.indication ? `Indication: ${clinicalData.indication}.` : ''}</p>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid #ddd;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; width: 50%;"><strong>LMP:</strong> ${lmpStr}</td>
          <td style="border: 1px solid #ddd; padding: 6px; width: 50%;"><strong>Husband's Name:</strong> ${husband}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px;"><strong>Gestational Age (LMP):</strong> -- Weeks -- Days</td>
          <td style="border: 1px solid #ddd; padding: 6px;"><strong>EDD (LMP):</strong> --/--/----</td>
        </tr>
      </table>
      
      <h4>Fetal Biometry:</h4>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid #ddd;">
        <tr style="background-color: #f9fafb;">
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Parameter</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Measurement (mm)</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Gestational Age</th>
        </tr>
        <tr><td style="border: 1px solid #ddd; padding: 6px;">BPD</td><td style="border: 1px solid #ddd; padding: 6px;"></td><td style="border: 1px solid #ddd; padding: 6px;"></td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 6px;">HC</td><td style="border: 1px solid #ddd; padding: 6px;"></td><td style="border: 1px solid #ddd; padding: 6px;"></td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 6px;">AC</td><td style="border: 1px solid #ddd; padding: 6px;"></td><td style="border: 1px solid #ddd; padding: 6px;"></td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 6px;">FL</td><td style="border: 1px solid #ddd; padding: 6px;"></td><td style="border: 1px solid #ddd; padding: 6px;"></td></tr>
      </table>
      <p><strong>Estimated Fetal Weight:</strong> ______ grams (+/- 10%)</p>
      <h4>Findings:</h4>
      <p>Single live intrauterine fetus seen...</p>
    `;
  }

  // 2. KUB (Kidney Ureter Bladder) - Example Placeholder
  if (bodyPart && (bodyPart.includes('KUB') || bodyPart.includes('RENAL'))) {
    return `
      <h3>ULTRASOUND KUB</h3>
      <p><strong>Clinical Indication:</strong> ${clinicalData.indication || 'Loin pain / Hematuria'}</p>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid #ddd;">
        <tr style="background-color: #f9fafb;">
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Organ</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Size (cm)</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Parenchyma</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Calculi / Hydro</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px;"><strong>Right Kidney</strong></td>
          <td style="border: 1px solid #ddd; padding: 6px;">__ x __ cm</td>
          <td style="border: 1px solid #ddd; padding: 6px;">Normal echo pattern</td>
          <td style="border: 1px solid #ddd; padding: 6px;">Nil</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px;"><strong>Left Kidney</strong></td>
          <td style="border: 1px solid #ddd; padding: 6px;">__ x __ cm</td>
          <td style="border: 1px solid #ddd; padding: 6px;">Normal echo pattern</td>
          <td style="border: 1px solid #ddd; padding: 6px;">Nil</td>
        </tr>
      </table>
      <p><strong>Urinary Bladder:</strong> Well distended. Wall thickness normal. No intraluminal lesion.</p>
      <p><strong>Prostate:</strong> Size __ x __ x __ cm. Vol: __ cc.</p>
    `;
  }

  // 3. Chest X-ray (CXR) - Professional Screening
  if (modality === 'XR' || modality === 'CR' || modality === 'DX' || (bodyPart && bodyPart.includes('CHEST'))) {
    return `
      <h3>CHEST X-RAY PA VIEW</h3>
      <p><strong>Clinical Indication:</strong> ${clinicalData.indication || 'Screening / Routine'}</p>
      <ul>
        <li><strong>Lungs:</strong> The lung fields are clear. No focal consolidation, collapse or pleural effusion is seen.</li>
        <li><strong>Heart:</strong> Cardiothoracic ratio is within normal limits. Cardiac silhoutte is normal in size and shape.</li>
        <li><strong>Hila:</strong> Hilar shadows appear normal.</li>
        <li><strong>Mediastinum:</strong> Mediastinal shadow is central and appears normal.</li>
        <li><strong>Diaphragm:</strong> Both domes of diaphragm are normal in position and contour. Costophrenic angles are clear.</li>
        <li><strong>Bony Thorax:</strong> Visualized bones of thoracic cage appear normal.</li>
      </ul>
      <p><strong>IMPRESSION:</strong> NORMAL CHEST X-RAY STUDY.</p>
    `;
  }

  // 4. USG Abdomen & Pelvis (Whole Abdomen Screening)
  if ((modality === 'US' || modality === 'USG') && (bodyPart && bodyPart.includes('ABDOMEN'))) {
    return `
      <h3>ULTRASOUND WHOLE ABDOMEN & PELVIS</h3>
      <p><strong>Liver:</strong> Normal in size, shape and echo texture. No focal lesion or intrahepatic biliary radicle dilatation (IHBRD) seen. Portal vein is normal in caliber.</p>
      <p><strong>Gallbladder:</strong> Well distended. Wall thickness is normal. No calculi or intraluminal pathology noted. CBD is normal in caliber.</p>
      <p><strong>Spleen:</strong> Normal in size and echo texture. Splenic vein is normal.</p>
      <p><strong>Pancreas:</strong> Visualized parts of head, body and tail of pancreas appear normal in size and echo texture. Pancreatic duct is not dilated.</p>
      <p><strong>Kidneys:</strong> Both kidneys are normal in size, position and echo texture. Corticomedullary differentiation is well preserved. No calculi or hydronephrosis seen on either side.</p>
      <p><strong>Urinary Bladder:</strong> Well distended. Wall thickness is normal. No intraluminal lesion or calculi seen.</p>
      <p><strong>Uterus / Prostate:</strong> Visualized pelvic organs appear normal for age and sex.</p>
      <p><strong>Peritoneum:</strong> No evidence of free fluid or significant lymphadenopathy in the abdomen.</p>
      <p><strong>IMPRESSION:</strong> NORMAL ULTRASOUND STUDY OF WHOLE ABDOMEN AND PELVIS.</p>
    `;
  }

  return null;
};
