-- Crear tabla de esquemas de datasets
CREATE TABLE IF NOT EXISTS ml_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(255) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    columns JSONB NOT NULL, -- Array de nombres de columnas
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de datos ML (almacenamiento flexible con JSONB)
CREATE TABLE IF NOT EXISTS ml_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID NOT NULL REFERENCES ml_schemas(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Datos de la fila en formato JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_ml_schemas_client ON ml_schemas(client_id);
CREATE INDEX IF NOT EXISTS idx_ml_schemas_name ON ml_schemas(schema_name);
CREATE INDEX IF NOT EXISTS idx_ml_data_schema ON ml_data(schema_id);
CREATE INDEX IF NOT EXISTS idx_ml_data_client ON ml_data(client_id);
CREATE INDEX IF NOT EXISTS idx_ml_data_created ON ml_data(created_at);

-- Índice GIN para búsqueda dentro de JSONB
CREATE INDEX IF NOT EXISTS idx_ml_data_jsonb ON ml_data USING GIN (data);
