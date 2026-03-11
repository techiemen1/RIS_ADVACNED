# RIS-iPACX: Administrator Guide

This guide is intended for Hospital IT and System Administrators managing the RIS-iPACX platform.

## 1. Staff & Teams Command Center
Administrators control system access and institutional structure via `Settings > Staff & Teams`. This is a unified 2-Phase workflow:

### Phase 1: Clinical Hierarchy
Define your institution's permanent structure:
- **Departments**: Categorize staff into functional wings (e.g., Radiology, Cardiology).
- **Designations**: Assign professional specialties and clinical ranks.
*Note: Changes here instantly update dropdowns in the Staff Registry.*

### Phase 2: Staff Registry
Onboard personnel into the defined hierarchy:
- **User Creation**: Define login IDs, secure passwords, and assign system roles.
- **Privilege Matrix**: Granular toggles for **Order**, **Report**, and **Schedule** access.
- **Sync Hierarchy**: Use the 'Sync Hierarchy' button to refresh local data if you've recently modified departments above.

## 2. Branding & Identity
The platform uses the **iPacx Architect Gold Edition** identity.
- **Logo**: Premium Gold/Amber shield with Gen 2 indicators.
- **Branding**: The interface is branded as **"IPACX-RIS"**.
- **Special Badges**: Administrative users are automatically badged as **"Medical Staff"** in the profile HUD for clear identification.

## 3. DICOM Network Center
Registering and monitoring modalities is critical for the PACS workflow.
- **AE Title Mapping**: Ensure the modality's AE Title is correctly registered in the RIS to allow Worklist queries.
- **Protocol Configuration**: Select between **DIMSE** (standard) or **DICOMweb** (web-native) for study retrieval and worklist sync.
- **Connection Diagnostics**: Use the 'Test Connection' button to verify connectivity to external PACS servers.

## 3. Report Templates
Manage the library of standardized findings and impressions.
- **Template Selector**: Templates are automatically filtered by Modality and Body Part.
- **Advanced Metadata**: Use variables like `{patientName}` or `{todayDate}` for automated header generation.

## 4. Clinical Intelligence & Regionalization
- **AI Triage**: Configure Synapse Intelligence nodes for background study analysis.
- **IST & Localisation**: System operates natively in IST (India Standard Time) with Indian Rupee (₹) financial tracking.
- **Secure Share Logs**: Track link generation and OTP verification events in the shared records registry.
- **Financial RCM**: Monitor payment collection status and generate revenue analytics via the Billing module.
- **GST Compliance**: Configure hospital GSTIN and tax rates for automated invoicing.
- **Communication Center**: Configure SMTP settings for Email alerts and obtain the WhatsApp Business Cloud API token for high-priority dispatches.

## 5. Security & Audit Logs
- **Audit Trails**: Monitor every PHI access event in `Settings > Audit Logs`.
- **System Hardening**: Restrict API access to the hospital's internal IP range using the `Allowed LAN CIDR` setting.

---
*Documentation Version: 2.0 (Clinical Intelligence Update)*
