-- Migration: Add GST support and link Billing to Orders
ALTER TABLE billing 
    ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id),
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
    ALTER COLUMN worklist_id DROP NOT NULL;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_billing_order_id ON billing(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_number ON billing(invoice_number);
