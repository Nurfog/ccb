-- Modificar tabla users para soportar roles y un superadmin sin cliente asociado
ALTER TABLE users ALTER COLUMN client_id DROP NOT NULL;

-- Crear enum de roles
CREATE TYPE user_role_enum AS ENUM ('root', 'company_admin', 'user');

-- Agregar columna rol
ALTER TABLE users ADD COLUMN role user_role_enum NOT NULL DEFAULT 'user';

-- Crear un usuario root por defecto (password: 'admin123')
-- Nota: La contraseña debe ser hasheada en la aplicación, pero para el seed inicial usaremos un placeholder o un hash pre-calculado.
-- Aquí insertamos un hash Argon2 válido para 'admin123' (generado externamente para este ejemplo)
-- Hash: $argon2id$v=19$m=19456,t=2,p=1$VE01UjR5N3k=$P2/dIw... (este es un ejemplo, mejor lo generamos en código o usamos uno conocido)
-- Usaremos un hash dummy temporal y recomendamos cambiarlo en el primer login o login especial.
-- Mejor estrategia: No insertar usuario aquí, crear un comando CLI "create-superuser" o un endpoint de setup.
-- Pero para facilitar, insertaremos uno si no existe.
