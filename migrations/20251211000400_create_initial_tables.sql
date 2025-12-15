-- Primero, creamos el tipo ENUM personalizado para los tipos de cliente.
-- Esto nos asegura que el campo `client_type` solo pueda tener estos dos valores.
CREATE TYPE client_type_enum AS ENUM ('company', 'natural_person');

-- Tabla para almacenar la información de los clientes (empresas o personas).
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_type client_type_enum NOT NULL,
    contract_expires_at TIMESTAMPTZ, -- NULL para empresas, con fecha para personas
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los usuarios que pertenecen a un cliente.
-- Una empresa puede tener muchos usuarios, una persona natural usualmente uno.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los tokens de API.
-- Guardamos un hash del token por seguridad.
CREATE TABLE api_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para definir los esquemas de datos personalizados de cada cliente.
-- El campo 'fields' es JSONB y guardará la estructura de las columnas.
CREATE TABLE custom_data_schemas (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    schema_name VARCHAR(255) NOT NULL,
    fields JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para almacenar las filas de datos subidas por los clientes.
-- El campo 'data' es JSONB y contendrá los datos reales que coinciden con el esquema.
CREATE TABLE custom_data_rows (
    id SERIAL PRIMARY KEY,
    schema_id INTEGER NOT NULL REFERENCES custom_data_schemas(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add migration script here
