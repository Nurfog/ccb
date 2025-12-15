# Guía Rápida: Entrenar tu Primer Modelo

## Paso 1: Subir Datos

Primero, asegúrate de tener datos cargados en el sistema:

1. Accede a `http://localhost:8080`
2. Login con `root@ccb.com` / `admin`
3. Ve a "Cargar Datos"
4. Sube un archivo CSV o Excel

El archivo debe tener **columnas numéricas** para entrenar un modelo de regresión.

### Ejemplo de CSV válido:
```csv
edad,salario,años_experiencia,ingreso_anual
25,35000,2,42000
30,50000,5,60000
28,45000,3,54000
```

## Paso 2: Obtener el Schema ID

Después de subir el archivo, ve al Dashboard y verás tu dataset en "Últimos Uploads".

O consulta vía API:
```bash
curl http://localhost:8000/api/analytics \
  -H "Authorization: Bearer TU_TOKEN"
```

Verás algo como:
```json
{
  "recent_uploads": [
    {
      "schema_name": "info_csv_20251212_023456",
      "row_count": 1234,
      "created_at": "2025-12-12T02:34:56Z"
    }
  ]
}
```

Luego obtén el ID completo del schema:
```bash
# Desde el contenedor de base de datos
docker exec ccb_db psql -U user -d ml_db \
  -c "SELECT id, schema_name, row_count FROM ml_schemas;"
```

Copia el `id` (UUID).

## Paso 3: Entrenar el Modelo

### Opción A: Desde la línea de comandos (Directo al ML Service)

```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "TU_SCHEMA_ID_AQUI",
    "model_type": "regression",
    "hyperparameters": {
      "target_column": "ingreso_anual",
      "epochs": 100,
      "learning_rate": 0.001,
      "batch_size": 32
    }
  }'
```

**Respuesta esperada**:
```json
{
  "model_id": "abc123-def456-...",
  "status": "training_complete",
  "message": "Modelo entrenado exitosamente",
  "device": "cuda:0",
  "metrics": {
    "final_loss": 0.0234,
    "r2_score": 0.9567,
    "epochs_trained": 100,
    "samples": 1234,
    "features": 3
  },
  "feature_names": ["edad", "salario", "años_experiencia"],
  "target_column": "ingreso_anual"
}
```

### Opción B: Vía Backend Rust (Próximamente)

```bash
curl -X POST http://localhost:3000/api/ml/train \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "TU_SCHEMA_ID",
    "model_type": "regression"
  }'
```

## Métricas del Modelo

### `final_loss` (Error Cuadrático Medio)
- **Más bajo es mejor**
- Indica qué tan cerca están las predicciones de los valores reales

### `r2_score` (Coeficiente de Determinación)
- **Rango**: -∞ a 1.0
- **1.0**: Modelo perfecto
- **0.8-0.9**: Muy bueno
- **0.6-0.8**: Bueno
- **<0.5**: Pobre

## Hiperparámetros Explicados

### `target_column` (Obligatorio)
La columna que quieres predecir.
```json
"target_column": "ingreso_anual"
```

### `epochs` (default: 100)
Número de veces que el modelo ve todos los datos.
- **Más epochs**: Mejor aprendizaje (pero más lento)
- **Menos epochs**: Más rápido (pero puede no aprender bien)

**Recomendación**: 
- Datos pequeños (<1000 filas): 50-100 epochs
- Datos medianos (1000-10000): 100-200 epochs
- Datos grandes (>10000): 200-500 epochs

### `learning_rate` (default: 0.001)
Qué tan rápido aprende el modelo.
- **Muy alto** (0.01-0.1): Aprende rápido pero puede ser inestable
- **Medio** (0.001-0.01): Balance
- **Muy bajo** (<0.001): Aprende lento pero más preciso

### `batch_size` (default: 32)
Cuántas filas procesa a la vez.
- **Más grande**: Más rápido (usa más GPU)
- **Más pequeño**: Más preciso (usa menos memoria)

**Para RTX 2070 Super (8GB)**:
- Datasets pequeños: 64-128
- Datasets medianos: 32-64
- Datasets grandes: 16-32

## Monitorear Entrenamiento

Ver logs en tiempo real:
```bash
docker logs -f ccb_ml_service
```

Verás algo como:
```
INFO: Iniciando entrenamiento: regression para schema abc-123
INFO: Cargadas 1234 filas de datos
INFO: Columnas disponibles: ['edad', 'salario', 'años_experiencia', 'ingreso_anual']
INFO: Columna objetivo: ingreso_anual
INFO: Datos preparados: 1234 samples, 3 features
INFO: Iniciando entrenamiento: 100 epochs, 1234 samples, batch_size=32
INFO: Epoch 10/100 - Loss: 0.123456
INFO: Epoch 20/100 - Loss: 0.089123
...
INFO: Epoch 100/100 - Loss: 0.023456
INFO: Entrenamiento completado - Loss: 0.023456, R²: 0.9567
INFO: Modelo guardado: /app/models/abc123-def456.pt
```

## Uso de GPU

Durante el entrenamiento, monitorea la GPU:
```bash
watch -n 1 nvidia-smi
```

Verás:
```
+-----------------------------------------------------------------------------+
| NVIDIA GeForce RTX 2070 SUPER    Driver Version: 535.xx   CUDA Version: 12.1|
|-------------------------------+----------------------+----------------------|
|   0  N/A  N/A   50C    P2    150W / 215W |   2345MiB /  8192MiB |     95%   |
```

- **GPU-Util**: Debe estar cerca de 100% durante el entrenamiento
- **Memory-Usage**: Cuánta VRAM está usando (de 8GB total)
- **Power**: Consumo actual vs máximo

## Troubleshooting

### Error: "No se encontraron datos para ese schema"
- Verifica que el `schema_id` sea correcto
- Verifica que hayas subido datos

### Error: "CUDA out of memory"
- Reduce `batch_size` (prueba con 16 o 8)
- Reduce el dataset (usa menos filas)
- Cierra otras aplicaciones que usen GPU

### El modelo tiene R² bajo (<0.5)
- Aumenta `epochs` (prueba con 200-500)
- Verifica que tus datos tengan correlación
- Prueba ajustar `learning_rate`

### Entrenamiento muy lento
- Verifica que esté usando GPU: `device: "cuda:0"` en la respuesta
- Si dice `device: "cpu"`, revisa que el perfil GPU esté activo

## Próximo Paso: Hacer Predicciones

Una vez entrenado, guarda el `model_id` de la respuesta.

Podrás usar ese modelo para hacer predicciones sobre nuevos datos.

---

¡Listo! Ya sabes cómo entrenar modelos ML con tu GPU. 🚀
