# RIS-iPACX: PACS Explorer

The PACS Explorer provides a high-performance interface for browsing and analysis of DICOM imaging studies.

## 1. Study Navigation
- **Query Parameters**: Browse studies by Patient ID, Accession Number, or Date Range.
- **Service Integration**: Communicates via QIDO-RS (DICOMweb) or C-FIND (DIMSE) depending on the target PACS configuration.

## 2. Advanced Multi-view
- **Split Screen**: Allows radiologists to view two different studies (e.g., historical vs. current) side-by-side for longitudinal comparison.
- **Series Selection**: Granular control over which series are loaded into the viewport.

## 3. Metadata Depth
- **Deep Scraper**: Automatically retrieves extended DICOM tags (Modality, Body Part, Referring Physician) when they are missing at the primary study level.
- **Cache Management**: Results are cached locally to provide a near-instantaneous browsing experience for previously visited studies.

## 4. Viewing Integration
- **OHIF Launcher**: Seamlessly transitions from browsing to full-screen image analysis in the medical-grade OHIF viewer.

---
*Documentation Version: 1.0 (Page-wise: PACS Explorer)*
