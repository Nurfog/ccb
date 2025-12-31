-- Migration: Create ml_models table
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY,
    schema_id UUID NOT NULL REFERENCES ml_schemas(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    model_type VARCHAR(50) NOT NULL,
    model_path TEXT NOT NULL,
    metrics JSONB NOT NULL,
    feature_metadata JSONB NOT NULL,
    target_column VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_models_schema ON ml_models(schema_id);
CREATE INDEX idx_ml_models_client ON ml_models(client_id);
