# RIS-iPACX: PACS Integration Module

This module handles all communications between the RIS and external DICOM servers (PACS).

## 1. PACS Server Management
Administrators can register multiple PACS servers through the **DICOM Network Center**.

### Server Attributes
- **Name**: Friendly identifier for the system.
- **Protocol**: `DICOMWEB` (QIDO-RS/WADO-RS) or `DIMSE` (C-ECHO/C-FIND).
- **Host/Port**: Network location of the PACS.
- **AE Title**: Required for DIMSE operations.
- **Base URL**: Required for DICOMweb operations.

## 2. Connectivity Testing
The system provides a built-in connection tester in `Settings > DICOM Network`.
- **DICOMweb**: Verifies endpoint existence and authentication via a QIDO query.
- **DIMSE**: Performs a standard C-ECHO (Ping).

## 3. Advanced Metadata Fetching (DeepMetadata)
To ensure reports are populated with complete patient details, the system uses a **4-Layer Waterfall Logic**:

1. **Layer 1 (Study Level)**: Fastest query for basic demographics and study date.
2. **Layer 2 (Series Scan)**: Used if Body Part or Modality is missing at study level.
3. **Layer 3 (Instance Dump)**: Gold standard retrieval for specific missing tags (Accession, Sex, Age).
4. **Layer 4 (Heuristic)**: Inferred modality based on Study Description if all DICOM tags are missing or generic.

## 4. Performance Optimization
Fetch results are cached in the `pacs_studies` table to reduce redundant network load on the PACS server.

---
*Documentation Version: 1.0 (PACS Module)*
