-- App Schema Tables
\connect scd_research_secure

BEGIN;

-- User sessions table
CREATE TABLE app.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE app.user_preferences (
    user_id TEXT PRIMARY KEY,
    default_view TEXT,
    theme TEXT DEFAULT 'light',
    table_page_size INTEGER DEFAULT 10,
    notification_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application settings table
CREATE TABLE app.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cache table for frequently accessed data
CREATE TABLE app.cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application logs (separate from audit logs)
CREATE TABLE app.logs (
    id BIGSERIAL PRIMARY KEY,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample ID sequence tracker
CREATE TABLE app.sample_id_sequences (
    subject_id TEXT PRIMARY KEY,
    last_sample_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION app.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_sessions_timestamp
    BEFORE UPDATE ON app.sessions
    FOR EACH ROW
    EXECUTE FUNCTION app.update_timestamp();

CREATE TRIGGER update_user_preferences_timestamp
    BEFORE UPDATE ON app.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION app.update_timestamp();

CREATE TRIGGER update_settings_timestamp
    BEFORE UPDATE ON app.settings
    FOR EACH ROW
    EXECUTE FUNCTION app.update_timestamp();

CREATE TRIGGER update_sample_id_sequences_timestamp
    BEFORE UPDATE ON app.sample_id_sequences
    FOR EACH ROW
    EXECUTE FUNCTION app.update_timestamp();

-- Create indexes
CREATE INDEX idx_sessions_user_id ON app.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON app.sessions(expires_at);
CREATE INDEX idx_cache_expires_at ON app.cache(expires_at);
CREATE INDEX idx_logs_level ON app.logs(level);
CREATE INDEX idx_logs_created_at ON app.logs(created_at);

-- Insert default settings
INSERT INTO app.settings (key, value, description) VALUES
    ('sample_id_format', '{"prefix": "OMI-", "digits": 4}', 'Format for generating new sample IDs'),
    ('allowed_assay_types', '["ADVIA", "DNA", "F-CELLS", "PBMC", "ADHESION", "LORRCA", "VISCOSITY", "PLASMA"]', 'List of allowed assay types'),
    ('data_entry_validations', '{
        "age_range": {"min": 0, "max": 120},
        "sample_number_range": {"min": 1, "max": 999}
    }', 'Validation rules for data entry');

-- Grant permissions
GRANT USAGE ON SCHEMA app TO scd_app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO scd_app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO scd_app_user;

COMMIT; 