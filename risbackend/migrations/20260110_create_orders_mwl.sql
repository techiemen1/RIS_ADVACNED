-- Up Migration
CREATE TYPE order_status AS ENUM ('SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    accession_number VARCHAR(64) UNIQUE NOT NULL,
    study_instance_uid VARCHAR(64) UNIQUE NOT NULL,
    modality VARCHAR(16) NOT NULL,
    procedure_code VARCHAR(32),
    procedure_description TEXT,
    ordering_physician VARCHAR(255),
    clinical_indication TEXT,
    status order_status DEFAULT 'SCHEDULED',
    scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_accession ON orders(accession_number);
CREATE INDEX idx_orders_modality_status ON orders(modality, status);
CREATE INDEX idx_orders_scheduled_time ON orders(scheduled_time);

-- Down Migration
-- DROP TABLE orders;
-- DROP TYPE order_status;
