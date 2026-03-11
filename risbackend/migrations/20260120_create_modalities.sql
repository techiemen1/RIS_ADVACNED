-- Up Migration
CREATE TABLE modalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ae_title VARCHAR(64) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL, -- IPv4 or IPv6
    port INTEGER NOT NULL DEFAULT 104,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modalities_aet ON modalities(ae_title);

-- Down Migration
-- DROP TABLE modalities;
