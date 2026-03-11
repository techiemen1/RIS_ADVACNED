# RIS-iPACX: Reporting Lifecycle

The Reporting module manages the transformation of clinical observations into finalized diagnostic records.

## 1. Reporting Workflow
- **Assignment**: Studies are assigned to specific radiologists via the dashboard.
- **Content Creation**: Radiologists use the Advanced Editor with Smart Templates and Dictation.
- **Key Images**: Important findings are evidenced by embedding key DICOM images.

## 2. Finalization Process
- **Verification**: The system validates that all critical segments (Findings, Impression) are documented.
- **Freezing**: Once finalized, the report text becomes immutable (cannot be changed).
- **Digital Branding**: Finalized reports are rendered with the hospital's header/footer and the radiologist's signature.

## 3. Distribution
- **HL7 Send**: Upon finalization, the RIS automatically wraps the report in an HL7 ORU message and sends it to the EMR.
- **PDF Generation**: A medical-grade PDF is generated for physical printing or digital download.

---
*Documentation Version: 1.0 (Page-wise: Reporting)*
