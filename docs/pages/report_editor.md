# RIS-iPACX: Advanced Report Editor

The Report Editor is the core clinical interface where radiologists translate imaging findings into structured medical documents.

## 1. Smart Template Engine
- **Context-Aware Loading**: Templates are dynamically fetched based on the study's **Modality** (e.g., CT, MR) and **Body Part**.
- **Dynamic Field Injection**: Automatically populates patient demographics (Name, ID, Gender, Age) directly into the report header.

## 2. Medical Dictation Integration
- **Speech-to-Text (Vosk)**: Real-time STT engine optimized with a 500+ term radiology lexicon.
- **Shortcuts & Expansions**: Supports macros (e.g., "NAD" → "No Abnormality Detected") to accelerate reporting speed.

## 3. Clinical Image Management
- **Key Images**: Radiologists can select and embed specific DICOM instances from the PACS directly into the report.
- **Side-by-Side Viewing**: Integrated viewer allows for simultaneous reporting and image analysis.

## 4. Verification & Digital Signatures
- **Drafting**: Auto-saves work-in-progress to prevent data loss.
- **Validation**: Ensures mandatory fields (e.g., Clinical History, Impression) are filled before finalization.
- **Finalization**: Locks the report and applies the doctor's digital signature and timestamp.

---
*Documentation Version: 1.0 (Page-wise: Report Editor)*
