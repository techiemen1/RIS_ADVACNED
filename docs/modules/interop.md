# RIS-iPACX: HL7 Enterprise Interoperability

This module manages the bi-directional exchange of clinical data between the RIS and Hospital Information Systems (HIS/EMR) using the HL7 v2.x standard.

## 1. MLLP Protocol Wrapping
To ensure reliable delivery over TCP/IP, all HL7 messages are wrapped in the **Minimal Lower Layer Protocol (MLLP)**.

- **Start Block**: `0x0B` (Vertical Tab)
- **End Block**: `0x1C 0x0D` (File Separator + Carriage Return)

## 2. Advanced ORU^R01 (Observation Result)
The system automatically transmits finalized radiology reports to the EMR.
- **Segments**: `MSH` (Header), `PID` (Patient ID), `OBR` (Observation Request), `OBX` (Observation Result).
- **Data Escaping**: All clinical text is escaped (e.g., `|` becomes `\F\`) to comply with HL7 formatting rules.

## 3. Planned: ADT & ORM Integration
Future updates will include support for inbound messaging:
- **ADT (Admit, Discharge, Transfer)**: Automatically creates patient records in the RIS when they register at the hospital front desk.
- **ORM (Order Message)**: Automatically creates a study order in the RIS when a physician requests a scan in the EMR.

## 4. Troubleshooting
- **Timeout**: The RIS waits 5 seconds for an ACK (Acknowledgement) from the EMR before timing out.
- **Connection Error**: Check the `HL7_HOST` and `HL7_PORT` settings in the environment configuration.

---
*Documentation Version: 1.0 (Interoperability Module)*
