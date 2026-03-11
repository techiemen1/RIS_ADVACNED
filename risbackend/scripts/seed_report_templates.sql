-- scripts/seed_report_templates.sql
INSERT INTO report_templates (name, modality, content, created_at)
VALUES
('CR Chest - Basic', 'CR', '<h3>Chest X-Ray (CR)</h3><p>Clinical history: ____</p><p>Findings: ____</p><p>Impression: 1) ____</p>', now()),
('Chest X-Ray - Adult', 'XR', '<h3>Adult Chest X-Ray</h3><p>History: </p><p>Findings:</p><ul><li>Cardiomediastinal silhouette: </li><li>Lungs: </li></ul><p>Conclusion:</p>', now()),
('CT Head - Non-Contrast', 'CT', '<h3>CT Head (NC)</h3><p>Indication:</p><p>Technique: Non-contrast axial images</p><p>Findings:</p><p>Impression:</p>', now()),
('MRI Brain - Routine', 'MR', '<h3>MRI Brain</h3><p>History:</p><p>Technique:</p><p>Findings:</p><p>Impression:</p>', now()),
('US Abdomen - Limited', 'US', '<h3>US Abdomen</h3><p>History:</p><p>Findings:</p><p>Impression:</p>', now()),
('Spine X-Ray', 'XR', '<h3>Spine X-Ray</h3><p>Levels:</p><p>Findings:</p><p>Impression:</p>', now()),
('Bone - Skeletal Survey', 'XR', '<h3>Bone Report</h3><p>History:</p><p>Findings:</p><p>Impression:</p>', now()),
('Mammography - Screening', 'MG', '<h3>Mammography</h3><p>History:</p><p>Findings:</p><p>Impression / BI-RADS:</p>', now()),
('PET-CT Summary', 'PT', '<h3>PET-CT</h3><p>Indication:</p><p>Technique:</p><p>Findings:</p><p>Impression:</p>', now()),
('Echo Summary', 'US', '<h3>Echocardiography</h3><p>Indication:</p><p>Findings:</p><p>Impression:</p>', now());
