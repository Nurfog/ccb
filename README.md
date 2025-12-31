# CCB - Plataforma SaaS de Machine Learning

[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen.svg)](https://www.docker.com/)

Plataforma empresarial multitenancy para gestión de datos y análisis de Machine Learning con control granular de permisos y roles.

## 🌟 Características Principales

### Gestión Multiempresa
- **Multitenancy**: Aislamiento completo de datos por empresa
- **Tipos de Cliente**: Soporte para empresas y personas naturales
- **Gestión de Contratos**: Control de duración y expiración para clientes individuales

### Sistema de Roles y Permisos
- **Root**: Administración global del sistema
- **Company Admin**: Gestión de usuarios y datos de su empresa
- **Usuario Estándar**: Acceso a funcionalidades según permisos asignados

#### Permisos Granulares
- **Status de Usuario**: `active` / `disabled`
- **Nivel de Acceso**: `read_write` / `read_only`
- Validación de permisos en tiempo real

### Gestión de Datos
- **Carga de Archivos**: Soporte para CSV y Excel (XLSX, XLS)
- **Procesamiento Automático**: Análisis y almacenamiento de datasets
- **Drag & Drop**: Interfaz intuitiva para carga de archivos
- **Validación**: Control de permisos de escritura antes de subir datos

### Dashboard Analytics
- **Métricas en Tiempo Real**: Visualización de estadísticas según rol
- **Tarjetas Interactivas**: Total de empresas, usuarios activos, datasets
- **Diseño Responsivo**: Adaptación automática a diferentes dispositivos
- **Acciones Rápidas**: Navegación optimizada a funcionalidades clave

### Interfaz de Usuario
- **Diseño Moderno**: Glassmorphism y gradientes premium
- **Sistema de Diseño Unificado**: Componentes CSS reutilizables
- **Dark Mode**: Tema oscuro profesional por defecto
- **Animaciones Suaves**: Micro-interacciones para mejor UX

### Machine Learning
- **PyTorch + CUDA**: Aceleración GPU para entrenamiento rápido
- **Microservicio ML**: Arquitectura desacoplada y escalable
- **API de Entrenamiento**: Endpoints para entrenar modelos personalizados con soporte para datos categóricos y fechas
- **API de Predicciones**: Inferencia en tiempo real con persistencia de modelos
- **Predicciones UI**: Interfaz dinámica para realizar predicciones sobre modelos entrenados

### Características Avanzadas (Roadmap)
- **Sistema de Notificaciones**: Alertas en tiempo real para eventos del sistema (ej. entrenamiento completado)
- **Exportación de Reportes**: Descarga de reportes en formato **PDF** y **Excel (XLSX)**
- **Logs de Auditoría**: Registro detallado de acciones críticas para cumplimiento y seguridad
- **Seguridad Administrador**: Panel de visualización de eventos de sistema para usuarios Root

## 🚀 Inicio Rápido

### Requisitos Previos

- **Docker** y **Docker Compose**
- **Rust** 1.75+ (para desarrollo)
- **Node.js** 18+ (para desarrollo de frontend)
- **NVIDIA GPU** con CUDA 12.1+ (opcional, para ML acelerado)
- **NVIDIA Container Toolkit** (para soporte GPU en Docker)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd ccb
   ```

2. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz:
   ```env
   DATABASE_URL=postgres://user:password@db:5432/ml_db
   JWT_SECRET=tu_secreto_super_seguro_aqui_cambiame
   ```

3. **Iniciar servicios con Docker**
   ```bash
   docker compose up -d
   ```

   Esto iniciará:
   - **Base de Datos** (PostgreSQL 16 con pgvector) en puerto `5432`
   - **Backend** (Rust/Axum) en puerto `3004` (mapeado de interno 3000)
   - **Frontend** (React/Nginx) en puerto `8080`
   - **ML Service** (Python/PyTorch) en puerto `8004` (mapeado de interno 8000)

   > **Nota GPU/CPU**: Por defecto, el ML Service usa CPU (compatible con cualquier máquina).
   > 
   > Si tienes GPU NVIDIA y quieres acelerar el entrenamiento:
   > ```bash
   > # Instala NVIDIA Container Toolkit primero (ver ml_service/GPU_SETUP.md)
   > docker compose --profile gpu up -d
   > ```
   > 
   > Ver `ml_service/CPU_VS_GPU.md` para más detalles sobre modos de ejecución.

4. **Acceder a la aplicación**
   
   Abre tu navegador en: `http://localhost:8080`

### Credenciales por Defecto

El sistema crea automáticamente un usuario root:

- **Email**: `root@ccb.com`
- **Contraseña**: `admin`

⚠️ **Importante**: Cambiar esta contraseña en producción.

## 📁 Estructura del Proyecto

```
ccb/
├── backend/                 # API REST en Rust
│   ├── src/
│   │   └── main.rs         # Handlers, modelos y lógica
│   ├── Cargo.toml          # Dependencias de Rust
│   └── Dockerfile          # Build multietapa optimizado
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── components/     # Componentes reutilizables
│   │   ├── context/        # Context API (Auth)
│   │   └── index.css       # Sistema de diseño global
│   ├── package.json
│   ├── nginx.conf          # Configuración proxy a backend
│   └── Dockerfile          # Build multietapa
├── migrations/             # Migraciones SQL
│   ├── 20231210000000_init.sql
│   └── 20251212000000_add_user_details.sql
├── docker-compose.yml      # Orquestación de servicios
└── README.md
```

## 🔧 API Endpoints

### Autenticación

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "contraseña"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@empresa.com",
    "role": "company_admin",
    "client_id": "uuid",
    "status": "active",
    "access_level": "read_write"
  }
}
```

### Gestión de Empresas (Root)

#### Crear Empresa
```bash
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Tech Solutions SpA",
  "client_type": "company"
}
```

#### Buscar Empresas
```bash
GET /api/clients/search?q=tech
Authorization: Bearer {token}
```

#### Buscar Empresas (Público - Login)
```bash
GET /api/public/clients/search?q=empresa
```

### Gestión de Usuarios

#### Crear Usuario (Root / Company Admin)
```bash
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "nuevo@empresa.com",
  "password": "contraseña_segura",
  "role": "user",
  "status": "active",
  "access_level": "read_write"
}
```

**Notas:**
- **Root**: Puede crear cualquier tipo de usuario y asignar cualquier empresa
- **Company Admin**: Solo puede crear usuarios en su propia empresa (User o Company Admin)

#### Listar Usuarios del Equipo
```bash
GET /api/company/users
Authorization: Bearer {token}
```

### Estadísticas del Dashboard

#### Obtener Métricas
```bash
GET /api/stats
Authorization: Bearer {token}
```

**Respuesta (ejemplo para Root):**
```json
{
  "total_clients": 15,
  "total_users": 47,
  "active_users": 42,
  "total_datasets": 0
}
```

### Carga de Datos

#### Subir Dataset
```bash
POST /api/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: archivo.csv
target_client_id: uuid (solo para Root)
```

**Respuesta:**
```json
{
  "message": "Dataset procesado exitosamente",
  "rows_inserted": 1250
}
```

## 👥 Flujo de Trabajo por Rol

### Root (Super Administrador)

1. **Registrar Empresa** → Crear perfil de cliente (empresa o persona natural)
2. **Crear Administrador** → Asignar admin a la empresa recién creada
3. **Monitorear Sistema** → Ver métricas globales en el dashboard
4. **Gestionar Accesos** → Habilitar/deshabilitar usuarios cuando sea necesario

### Company Admin (Administrador de Empresa)

1. **Gestionar Equipo** → Crear usuarios estándar o admins adicionales
2. **Configurar Permisos** → Asignar niveles de acceso (lectura/escritura)
3. **Cargar Datos** → Subir datasets para análisis
4. **Monitorear Equipo** → Ver usuarios activos y su estado

### Usuario Estándar

1. **Cargar Datos** → Subir archivos (si tiene permisos de escritura)
2. **Consultar Dashboard** → Ver métricas personales
3. **Actualizar Perfil** → Gestionar información personal

## 🛠️ Desarrollo

### Backend (Rust)

```bash
cd backend

# Compilar
cargo build

# Ejecutar en modo desarrollo
cargo run

# Aplicar migraciones
cargo sqlx migrate run

# Preparar queries offline
cargo sqlx prepare --workspace
```

### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build
```

### Docker Rebuild

```bash
# Reconstruir todo
docker compose up -d --build

# Reconstruir solo backend
docker compose up -d --build backend

# Reconstruir solo frontend
docker compose up -d --build frontend
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

- **clients**: Empresas y personas naturales
- **users**: Usuarios del sistema con roles y permisos
- **ml_schemas**: Esquemas de datasets cargados (en desarrollo)
- **ml_data**: Datos procesados de ML (en desarrollo)

### Enums

- **client_type_enum**: `company` | `natural_person`
- **user_role_enum**: `root` | `company_admin` | `user`
- **user_status**: `active` | `disabled`
- **access_level**: `read_write` | `read_only`

## 🔐 Seguridad

- **JWT**: Autenticación stateless con tokens firmados
- **Argon2**: Hash de contraseñas con salt automático
- **CORS**: Configurado para desarrollo (ajustar en producción)
- **Validación de Permisos**: Middleware de autorización por rol
- **SQL Injection Protection**: Prepared statements con SQLx

## 📊 Stack Tecnológico

### Backend
- **Rust** - Lenguaje de programación
- **Axum** - Framework web asíncrono
- **SQLx** - Query builder type-safe
- **Tokio** - Runtime asíncrono
- **Argon2** - Hashing de contraseñas
- **JWT** - Autenticación
- **Calamine** - Lectura de archivos Excel
- **CSV** - Procesamiento de archivos CSV

### Frontend
- **React 18** - Biblioteca UI
- **React Router** - Enrutamiento SPA
- **Vite** - Build tool y dev server
- **Lucide React** - Iconos modernos
- **CSS Variables** - Sistema de diseño

### Infraestructura
- **PostgreSQL 16** - Base de datos relacional
- **pgvector** - Extensión para embeddings ML
- **Docker** - Containerización
- **Nginx** - Servidor web y proxy

## 🚧 Roadmap

Para ver el roadmap detallado y futuras implementaciones, consultar [ROADMAP.md](./ROADMAP.md).

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👨‍💻 Contribuir

Para contribuir al proyecto:

1. Crear un branch desde `main`
2. Implementar cambios con commits descriptivos
3. Ejecutar tests y linting
4. Crear Pull Request con descripción detallada

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio.

---

**Última actualización:** Diciembre 2025

Desarrollado con ❤️ usando Rust y React
