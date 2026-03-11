CREATE TABLE IF NOT EXISTS pacs_servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'orthanc',
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    ae_title VARCHAR(100),
    username VARCHAR(100),
    password VARCHAR(100),
    last_connected TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    action TEXT NOT NULL,
    description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performant audit log retrieval
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
