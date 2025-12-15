use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{FromRequestParts, Multipart, State},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, RequestPartsExt, Router,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use calamine::Reader;
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::{env, io::Cursor, net::SocketAddr, time::Duration as StdDuration};
use tower_http::cors::CorsLayer;

// --- Configuración y Estado ---

#[derive(Clone)]
struct AppState {
    db_pool: PgPool,
    jwt_secret: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let _ = dotenvy::dotenv(); // Cargar .env

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL debe estar definida");
    let jwt_secret =
        env::var("JWT_SECRET").unwrap_or_else(|_| "secret_super_seguro_por_defecto".to_string());

    let db_pool = loop {
        match PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await
        {
            Ok(pool) => {
                tracing::info!("Conexión a la base de datos exitosa.");
                break pool;
            }
            Err(e) => {
                tracing::error!("Error de conexión DB: {}. Reintentando...", e);
                tokio::time::sleep(StdDuration::from_secs(2)).await;
            }
        }
    };

    // Inicializar usuario root si no existe
    if let Err(e) = ensure_root_user(&db_pool).await {
        tracing::error!("Error creando usuario root: {}", e);
    }

    let app_state = AppState {
        db_pool,
        jwt_secret,
    };

    let app = Router::new()
        .route("/api/greeting", get(greeting))
        .route("/api/auth/login", post(login))
        .route("/api/public/clients/search", get(search_clients_public)) // Nueva ruta pública
        // Rutas protegidas (requieren Auth implícito por extractor AuthUser en los handlers)
        .route("/api/clients/search", get(search_clients)) // Nueva ruta protegida
        .route("/api/users", post(register_user))
        .route("/api/clients", post(create_client))
        .route("/api/company/users", get(get_company_users))
        .route("/api/stats", get(get_stats))
        .route("/api/analytics", get(get_analytics))
        .route("/api/ml/train", post(train_ml_model))
        .route("/api/users/me", get(get_me))
        .route("/api/upload", post(upload_dataset))
        .layer(CorsLayer::permissive()) // Permitir CORS para desarrollo frontend
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Servidor escuchando en {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn ensure_root_user(pool: &PgPool) -> Result<(), sqlx::Error> {
    let root_email = "root@ccb.com";
    let exists = sqlx::query!("SELECT id FROM users WHERE email = $1", root_email)
        .fetch_optional(pool)
        .await?;

    if exists.is_none() {
        tracing::info!("Creando usuario root por defecto...");
        let salt = SaltString::generate(&mut OsRng);
        let password = "admin"; // Contraseña por defecto
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string();

        sqlx::query!(
            "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'root')",
            root_email,
            password_hash
        )
        .execute(pool)
        .await?;
        tracing::info!("Usuario root creado: {} / {}", root_email, password);
    }
    Ok(())
}

async fn greeting() -> Json<Value> {
    Json(json!({ "message": "¡Hola desde la API de Rust con Auth!" }))
}

// --- Search Handlers ---

#[derive(Serialize)]
struct ClientOption {
    id: uuid::Uuid,
    name: String,
}

#[derive(Deserialize)]
struct SearchParams {
    q: String,
}

async fn search_clients(
    State(state): State<AppState>,
    auth_user: AuthUser,
    axum::extract::Query(params): axum::extract::Query<SearchParams>,
) -> Result<Json<Vec<ClientOption>>, AppError> {
    // Solo Root puede buscar cualquier cliente.
    // CompanyAdmin podría buscar (o ver solo la suya).
    // Simplificación: Solo Root.
    if auth_user.role != UserRole::Root {
        return Err(AppError::Forbidden(
            "Solo Root puede buscar clientes globales".into(),
        ));
    }

    let pattern = format!("%{}%", params.q);
    let clients = sqlx::query_as!(
        ClientOption,
        "SELECT id, name FROM clients WHERE name ILIKE $1 LIMIT 10",
        pattern
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    Ok(Json(clients))
}

async fn search_clients_public(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<SearchParams>,
) -> Result<Json<Vec<ClientOption>>, AppError> {
    // Endpoint público para el Login (Autocomplete)
    // Devuelve solo ID y Nombre para UX.
    let pattern = format!("%{}%", params.q);
    let clients = sqlx::query_as!(
        ClientOption,
        "SELECT id, name FROM clients WHERE name ILIKE $1 LIMIT 5",
        pattern
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    Ok(Json(clients))
}

// --- Upload Handler (Modified) ---

#[derive(Serialize)]
struct UploadResponse {
    message: String,
    rows_processed: usize,
    schema_name: String,
}

async fn upload_dataset(
    State(state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    // Validar permisos generales
    if auth_user.client_id.is_none() && auth_user.role != UserRole::Root {
        return Err(AppError::Forbidden(
            "Usuario sin permisos de empresa.".into(),
        ));
    }

    if auth_user.access_level != "read_write" && auth_user.role != UserRole::Root {
        return Err(AppError::Forbidden("Cuenta de solo lectura.".into()));
    }

    let mut target_client_id = auth_user.client_id;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name = String::from("dataset");

    // Procesar Multipart: puede venir 'target_client_id' antes o después del 'file'
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("Error multipart".into()))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "target_client_id" {
            if auth_user.role == UserRole::Root {
                let val = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("Error leyendo client id".into()))?;
                if !val.is_empty() {
                    target_client_id = Some(
                        uuid::Uuid::parse_str(&val)
                            .map_err(|_| AppError::BadRequest("Client ID inválido".into()))?,
                    );
                }
            }
        } else if name == "file" {
            file_name = field.file_name().unwrap_or("dataset").to_string();
            file_bytes = Some(
                field
                    .bytes()
                    .await
                    .map_err(|_| AppError::InternalError)?
                    .to_vec(),
            );
        }
    }

    let data = file_bytes.ok_or(AppError::BadRequest("Falta el archivo".into()))?;

    // Si es Root y no especificó cliente, Error (o usar uno por defecto, pero mejor explícito)
    let final_client_id = target_client_id.ok_or(AppError::BadRequest(
        "Root debe seleccionar una empresa destino.".into(),
    ))?;

    let extension = std::path::Path::new(&file_name)
        .extension()
        .and_then(std::ffi::OsStr::to_str)
        .unwrap_or("")
        .to_lowercase();

    // Parsear datos
    let (headers, rows) = match extension.as_str() {
        "csv" => parse_csv(&data)?,
        "xlsx" => parse_excel(&data, true)?,
        "xls" => parse_excel(&data, false)?,
        _ => return Err(AppError::BadRequest("Formato no soportado".into())),
    };

    if rows.is_empty() {
        return Err(AppError::BadRequest("El archivo está vacío".into()));
    }

    // 1. Crear/Actualizar Schema
    let schema_name = format!(
        "{}_{}",
        file_name.replace(".", "_"),
        Utc::now().format("%Y%m%d_%H%M%S")
    );
    let columns_json = serde_json::to_value(&headers).unwrap();

    let schema_record = sqlx::query!(
        r#"
        INSERT INTO ml_schemas (client_id, schema_name, columns, row_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (schema_name) DO UPDATE 
        SET row_count = ml_schemas.row_count + $4, updated_at = NOW()
        RETURNING id
        "#,
        final_client_id,
        schema_name,
        columns_json,
        rows.len() as i32
    )
    .fetch_one(&state.db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    // 2. Insertar Filas en batch para mejor rendimiento
    let mut tx = state
        .db_pool
        .begin()
        .await
        .map_err(AppError::DatabaseError)?;

    for row in &rows {
        let row_json = serde_json::to_value(row).unwrap();
        sqlx::query!(
            "INSERT INTO ml_data (schema_id, client_id, data) VALUES ($1, $2, $3)",
            schema_record.id,
            final_client_id,
            row_json
        )
        .execute(&mut *tx)
        .await
        .map_err(AppError::DatabaseError)?;
    }

    tx.commit().await.map_err(AppError::DatabaseError)?;

    Ok(Json(UploadResponse {
        message: "Archivo procesado exitosamente".into(),
        rows_processed: rows.len(),
        schema_name,
    }))
}

fn parse_csv(
    data: &[u8],
) -> Result<(Vec<String>, Vec<std::collections::HashMap<String, String>>), AppError> {
    // Auto-detectar delimitador (coma o punto y coma)
    let sample = String::from_utf8_lossy(&data[..data.len().min(1000)]);
    let delimiter = if sample.contains(';') { b';' } else { b',' };

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .delimiter(delimiter)
        .flexible(true) // Permite diferentes números de campos
        .from_reader(Cursor::new(data));

    let headers = reader
        .headers()
        .map_err(|_| AppError::BadRequest("CSV Inválido: Error leyendo headers".into()))?
        .iter()
        .map(|s| s.trim().to_string()) // Trim espacios
        .collect::<Vec<String>>();

    let mut rows = Vec::new();
    for result in reader.deserialize() {
        let record: std::collections::HashMap<String, String> = result
            .map_err(|_| AppError::BadRequest("CSV Inválido: Error parseando fila".into()))?;
        rows.push(record);
    }

    Ok((headers, rows))
}

// --- Auth Handlers ---

#[derive(Deserialize)]
struct LoginPayload {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
    user: UserResponse,
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> Result<Json<LoginResponse>, AppError> {
    let user = sqlx::query_as!(
        User,
        r#"SELECT id, client_id, email, password_hash, role as "role: UserRole", status, access_level, created_at FROM users WHERE email = $1"#,
        payload.email
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    let user = user.ok_or(AppError::AuthError("Credenciales inválidas".into()))?;

    if user.status == "disabled" {
        return Err(AppError::AuthError(
            "Usuario deshabilitado por administración.".into(),
        ));
    }

    let parsed_hash =
        PasswordHash::new(&user.password_hash).map_err(|_| AppError::InternalError)?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::AuthError("Credenciales inválidas".into()))?;

    // Generar JWT
    let claims = Claims {
        sub: user.id.to_string(),
        role: user.role.clone(),
        client_id: user.client_id,
        access_level: user.access_level.clone(),
        exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|_| AppError::InternalError)?;

    Ok(Json(LoginResponse {
        token,
        user: UserResponse::from(user),
    }))
}

// --- User Handlers ---

// --- Router Update ---
// Need to add route("/api/company/users", get(get_company_users))
// I'll assume the user applies this manually or I do a separate edit for Router.
// I'll stick to handlers here.

#[derive(Deserialize)]
struct CreateUserPayload {
    email: String,
    password: String,
    role: UserRole,
    client_id: Option<uuid::Uuid>,
    status: Option<String>,
    access_level: Option<String>,
}

async fn register_user(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateUserPayload>,
) -> Result<(StatusCode, Json<UserResponse>), AppError> {
    let mut final_client_id = payload.client_id;
    let final_status = payload.status.unwrap_or_else(|| "active".to_string());
    let final_access = payload
        .access_level
        .unwrap_or_else(|| "read_write".to_string());

    // Permisos
    if auth_user.role == UserRole::Root {
        // Root puede hacer todo
    } else if auth_user.role == UserRole::CompanyAdmin {
        // Admin solo crea en su empresa
        let admin_client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Admin sin empresa".into()))?;

        // No puede crear Root
        if matches!(payload.role, UserRole::Root) {
            return Err(AppError::Forbidden("No puedes crear Super Usuarios".into()));
        }

        // Forzar client_id
        final_client_id = Some(admin_client_id);
    } else {
        return Err(AppError::Forbidden(
            "No tienes permiso para gestionar usuarios".into(),
        ));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| AppError::InternalError)?
        .to_string();

    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (email, password_hash, role, client_id, status, access_level)
        VALUES ($1, $2, $3::user_role_enum, $4, $5, $6)
        RETURNING id, client_id, email, password_hash, role as "role: UserRole", status, access_level, created_at
        "#,
        payload.email,
        password_hash,
        payload.role as UserRole,
        final_client_id,
        final_status,
        final_access
    )
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("unique constraint") {
            AppError::BadRequest("El email ya está registrado".into())
        } else {
            AppError::DatabaseError(e)
        }
    })?;

    Ok((StatusCode::CREATED, Json(UserResponse::from(user))))
}

async fn get_company_users(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    if auth_user.role != UserRole::CompanyAdmin && auth_user.role != UserRole::Root {
        return Err(AppError::Forbidden("Acceso denegado".into()));
    }

    let users = if auth_user.role == UserRole::Root {
        // Root ve todos? O le pasamos query param? Simplificación: Root ve todos los administradores o users.
        // Mejor: Si es Root ve todos por ahora para debugging.
        sqlx::query_as!(
            User,
            r#"SELECT id, client_id, email, password_hash, role as "role: UserRole", status, access_level, created_at FROM users ORDER BY created_at DESC LIMIT 50"#
        )
        .fetch_all(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
    } else {
        let client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Admin sin empresa".into()))?;
        sqlx::query_as!(
            User,
            r#"SELECT id, client_id, email, password_hash, role as "role: UserRole", status, access_level, created_at FROM users WHERE client_id = $1 ORDER BY created_at DESC"#,
            client_id
        )
        .fetch_all(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
    };

    Ok(Json(users.into_iter().map(UserResponse::from).collect()))
}

#[derive(Debug, Serialize)]
struct DashboardStats {
    total_clients: i64,
    total_users: i64,
    active_users: i64,
    total_datasets: i64,
}

async fn get_stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<DashboardStats>, AppError> {
    let total_clients = if auth_user.role == UserRole::Root {
        sqlx::query_scalar!("SELECT COUNT(*) as count FROM clients")
            .fetch_one(&state.db_pool)
            .await
            .map_err(AppError::DatabaseError)?
            .unwrap_or(0)
    } else {
        1 // Company admin solo ve su empresa
    };

    let total_users = if auth_user.role == UserRole::Root {
        sqlx::query_scalar!("SELECT COUNT(*) as count FROM users")
            .fetch_one(&state.db_pool)
            .await
            .map_err(AppError::DatabaseError)?
            .unwrap_or(0)
    } else if auth_user.role == UserRole::CompanyAdmin {
        let client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Admin sin empresa".into()))?;
        sqlx::query_scalar!(
            "SELECT COUNT(*) as count FROM users WHERE client_id = $1",
            client_id
        )
        .fetch_one(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
        .unwrap_or(0)
    } else {
        1 // Usuario estándar solo se ve a sí mismo
    };

    let active_users = if auth_user.role == UserRole::Root {
        sqlx::query_scalar!("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
            .fetch_one(&state.db_pool)
            .await
            .map_err(AppError::DatabaseError)?
            .unwrap_or(0)
    } else if auth_user.role == UserRole::CompanyAdmin {
        let client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Admin sin empresa".into()))?;
        sqlx::query_scalar!(
            "SELECT COUNT(*) as count FROM users WHERE client_id = $1 AND status = 'active'",
            client_id
        )
        .fetch_one(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
        .unwrap_or(0)
    } else {
        1
    };

    // Contar datasets/schemas por cliente
    let total_datasets = if auth_user.role == UserRole::Root {
        sqlx::query_scalar!("SELECT COUNT(DISTINCT schema_name) as count FROM ml_schemas")
            .fetch_one(&state.db_pool)
            .await
            .map_err(AppError::DatabaseError)?
            .unwrap_or(0)
    } else {
        let client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Usuario sin empresa".into()))?;
        sqlx::query_scalar!(
            "SELECT COUNT(DISTINCT schema_name) as count FROM ml_schemas WHERE client_id = $1",
            client_id
        )
        .fetch_one(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
        .unwrap_or(0)
    };

    Ok(Json(DashboardStats {
        total_clients,
        total_users,
        active_users,
        total_datasets,
    }))
}

#[derive(Debug, Serialize)]
struct DatasetSummary {
    schema_id: uuid::Uuid,
    schema_name: String,
    row_count: Option<i32>,
    created_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct AnalyticsResponse {
    recent_uploads: Vec<DatasetSummary>,
    total_rows: i64,
}

async fn get_analytics(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<AnalyticsResponse>, AppError> {
    let (recent_uploads, total_rows) = if auth_user.role == UserRole::Root {
        let uploads = sqlx::query_as!(
            DatasetSummary,
            r#"
            SELECT id as schema_id, schema_name, row_count, created_at
            FROM ml_schemas
            ORDER BY created_at DESC
            LIMIT 10
            "#
        )
        .fetch_all(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?;

        let total =
            sqlx::query_scalar!("SELECT COALESCE(SUM(row_count), 0) as total FROM ml_schemas")
                .fetch_one(&state.db_pool)
                .await
                .map_err(AppError::DatabaseError)?
                .unwrap_or(0);

        (uploads, total)
    } else {
        let client_id = auth_user
            .client_id
            .ok_or(AppError::Forbidden("Usuario sin empresa".into()))?;

        let uploads = sqlx::query_as!(
            DatasetSummary,
            r#"
            SELECT id as schema_id, schema_name, row_count, created_at
            FROM ml_schemas
            WHERE client_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            "#,
            client_id
        )
        .fetch_all(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?;

        let total = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(row_count), 0) as total FROM ml_schemas WHERE client_id = $1",
            client_id
        )
        .fetch_one(&state.db_pool)
        .await
        .map_err(AppError::DatabaseError)?
        .unwrap_or(0);

        (uploads, total)
    };

    Ok(Json(AnalyticsResponse {
        recent_uploads,
        total_rows,
    }))
}

#[derive(Debug, Deserialize)]
struct TrainMLRequest {
    schema_id: String,
    target_column: Option<String>,
    epochs: Option<i32>,
    learning_rate: Option<f64>,
    batch_size: Option<i32>,
}

async fn train_ml_model(
    State(_state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<TrainMLRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Validar permisos (debe tener acceso de escritura)
    if auth_user.access_level != "read_write" {
        return Err(AppError::Forbidden(
            "Necesitas permisos de escritura para entrenar modelos".into(),
        ));
    }

    // Preparar request para ML Service
    let mut hyperparameters = serde_json::Map::new();

    if let Some(target) = payload.target_column {
        hyperparameters.insert(
            "target_column".to_string(),
            serde_json::Value::String(target),
        );
    }
    if let Some(epochs) = payload.epochs {
        hyperparameters.insert(
            "epochs".to_string(),
            serde_json::Value::Number(epochs.into()),
        );
    }
    if let Some(lr) = payload.learning_rate {
        if let Some(num) = serde_json::Number::from_f64(lr) {
            hyperparameters.insert("learning_rate".to_string(), serde_json::Value::Number(num));
        }
    }
    if let Some(bs) = payload.batch_size {
        hyperparameters.insert(
            "batch_size".to_string(),
            serde_json::Value::Number(bs.into()),
        );
    }

    let ml_request = serde_json::json!({
        "schema_id": payload.schema_id,
        "model_type": "regression",
        "hyperparameters": hyperparameters
    });

    // Llamar al ML Service
    let client = reqwest::Client::new();
    let response = client
        .post("http://ccb_ml_service:8000/train")
        .json(&ml_request)
        .send()
        .await
        .map_err(|e| AppError::InternalError)?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".into());
        return Err(AppError::BadRequest(format!(
            "ML Service error: {}",
            error_text
        )));
    }

    let result: serde_json::Value = response.json().await.map_err(|_| AppError::InternalError)?;

    Ok(Json(result))
}

async fn get_me(auth_user: AuthUser) -> Json<AuthUser> {
    Json(auth_user)
}

// --- Client Handler (Updated) ---

async fn create_client(
    State(state): State<AppState>,
    auth_user: AuthUser, // Protegido
    Json(payload): Json<CreateClientPayload>,
) -> Result<(StatusCode, Json<Client>), AppError> {
    // Solo root o admins pueden crear clientes
    if auth_user.role != UserRole::Root {
        return Err(AppError::Forbidden("No tienes permiso".into()));
    }

    let contract_expires_at = match payload.client_type {
        ClientType::NaturalPerson => {
            if let Some(days) = payload.contract_duration_days {
                Some(Utc::now() + Duration::days(days))
            } else {
                return Err(AppError::BadRequest(
                    "Duración requerida para persona natural".into(),
                ));
            }
        }
        ClientType::Company => None,
    };

    let client = sqlx::query_as!(
        Client,
        r#"
        INSERT INTO clients (name, client_type, contract_expires_at)
        VALUES ($1, $2::client_type_enum, $3)
        RETURNING id, name, client_type as "client_type: _", contract_expires_at, created_at
        "#,
        payload.name,
        payload.client_type as ClientType,
        contract_expires_at,
    )
    .fetch_one(&state.db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    Ok((StatusCode::CREATED, Json(client)))
}

// --- Models & Structs ---

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, sqlx::Type)]
#[sqlx(type_name = "user_role_enum", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Root,
    CompanyAdmin,
    User,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct User {
    id: uuid::Uuid,
    client_id: Option<uuid::Uuid>,
    email: String,
    #[serde(skip)]
    password_hash: String,
    role: UserRole,
    status: String,
    access_level: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct UserResponse {
    id: uuid::Uuid,
    email: String,
    role: UserRole,
    client_id: Option<uuid::Uuid>,
    status: String,
    access_level: String,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            role: u.role,
            client_id: u.client_id,
            status: u.status,
            access_level: u.access_level,
        }
    }
}

// ... Client structs ...

// --- Login Handler Update ---
// (Need to update login query and logic)

// I will do separate replacement for login handler to avoid messing up models section if lines don't match exactly.
// This is just for Models right now.

// (Client structs maintained from previous state)
#[derive(Debug, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "client_type_enum", rename_all = "snake_case")]
pub enum ClientType {
    Company,
    NaturalPerson,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Client {
    id: uuid::Uuid,
    name: String,
    client_type: ClientType,
    contract_expires_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientPayload {
    name: String,
    client_type: ClientType,
    contract_duration_days: Option<i64>,
}

// --- Auth Logic & Middleware ---

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: UserRole,
    client_id: Option<uuid::Uuid>,
    access_level: String,
    exp: usize,
}

#[derive(Debug, Serialize)]
struct AuthUser {
    id: uuid::Uuid,
    role: UserRole,
    client_id: Option<uuid::Uuid>,
    access_level: String,
}

// Implement FromRequestParts for AuthUser to use it as an Extractor
#[axum::async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Unauthorized("Token faltante".into()))?;

        let token_data = decode::<Claims>(
            bearer.token(),
            &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized("Token inválido".into()))?;

        Ok(AuthUser {
            id: uuid::Uuid::parse_str(&token_data.claims.sub).unwrap(),
            role: token_data.claims.role,
            client_id: token_data.claims.client_id,
            access_level: token_data.claims.access_level,
        })
    }
}

// ... (Inside login handler, we need to update claims generation) ...

// Let's fix parse_excel first to be generic or separate.

fn parse_excel(
    data: &[u8],
    is_xlsx: bool,
) -> Result<(Vec<String>, Vec<std::collections::HashMap<String, String>>), AppError> {
    use calamine::{Reader, Xls, Xlsx};
    use std::io::Cursor;

    let cursor = Cursor::new(data);
    if is_xlsx {
        let mut workbook =
            Xlsx::new(cursor).map_err(|_| AppError::BadRequest("Error abriendo XLSX".into()))?;
        read_sheet(&mut workbook)
    } else {
        let mut workbook =
            Xls::new(cursor).map_err(|_| AppError::BadRequest("Error abriendo XLS".into()))?;
        read_sheet(&mut workbook)
    }
}

fn read_sheet<R: std::io::Read + std::io::Seek>(
    workbook: &mut impl calamine::Reader<R>,
) -> Result<(Vec<String>, Vec<std::collections::HashMap<String, String>>), AppError> {
    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or(AppError::BadRequest("Excel sin hojas".into()))?;

    if let Ok(range) = workbook.worksheet_range(&sheet_name) {
        let mut rows_iter = range.rows();

        let headers: Vec<String> = rows_iter
            .next()
            .ok_or(AppError::BadRequest("Excel vacío".into()))?
            .iter()
            .map(|cell| cell.to_string())
            .collect();

        let mut data_rows = Vec::new();

        for row in rows_iter {
            let mut row_map = std::collections::HashMap::new();
            for (i, cell) in row.iter().enumerate() {
                if i < headers.len() {
                    row_map.insert(headers[i].clone(), cell.to_string());
                }
            }
            data_rows.push(row_map);
        }

        Ok((headers, data_rows))
    } else {
        Err(AppError::BadRequest(
            "No se pudo leer la hoja de Excel".into(),
        ))
    }
}

// --- Errors ---
#[derive(Debug)]
enum AppError {
    BadRequest(String),
    AuthError(String),
    Forbidden(String),
    Unauthorized(String),
    DatabaseError(sqlx::Error),
    InternalError,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::AuthError(msg) => (StatusCode::UNAUTHORIZED, msg), // Login fallido
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg), // Token malo
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::DatabaseError(e) => {
                tracing::error!("DB Error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Error interno".into())
            }
            AppError::InternalError => (StatusCode::INTERNAL_SERVER_ERROR, "Error interno".into()),
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}
