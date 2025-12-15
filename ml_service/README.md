# CCB ML Service

Microservicio de Machine Learning con soporte **dual GPU/CPU**.

## 🚀 Flexibilidad Total

Este servicio funciona **sin GPU** (CPU-only) o **con GPU acelerado** (CUDA).

### ✅ Sin GPU
- Funciona en **cualquier máquina**
- Perfecto para **desarrollo y testing**
- Mismo código, sin cambios

### ⚡ Con GPU (RTX 2070 Super)
- **10-100x más rápido** en entrenamiento
- Ideal para **producción y modelos grandes**
- Autodetección automática

**Ver**: [CPU_VS_GPU.md](./CPU_VS_GPU.md) para comparación detallada

## Características

- **FastAPI**: API REST moderna y rápida
- **PyTorch**: Framework de Deep Learning con aceleración GPU
- **CUDA Support**: Aprovecha RTX 2070 Super para entrenamiento rápido
- **Modular**: Fácil de extender con nuevos modelos

## Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### Entrenar Modelo
```bash
POST http://localhost:8000/train
Content-Type: application/json

{
  "schema_id": "uuid-del-dataset",
  "model_type": "regression",  # regression | classification | clustering
  "hyperparameters": {
    "learning_rate": 0.001,
    "epochs": 100
  }
}
```

### Hacer Predicción
```bash
POST http://localhost:8000/predict
Content-Type: application/json

{
  "model_id": "model_xyz",
  "data": [
    {"feature1": 1.0, "feature2": 2.0},
    {"feature1": 1.5, "feature2": 2.5}
  ]
}
```

### Listar Modelos
```bash
GET http://localhost:8000/models
```

## Desarrollo Local

### Requisitos
- Python 3.10+
- CUDA Toolkit 12.1+
- NVIDIA GPU (RTX 2070 Super)

### Instalación
```bash
cd ml_service
pip install -r requirements.txt
```

### Ejecutar
```bash
python main.py
```

El servicio estará disponible en `http://localhost:8000`

## Docker con GPU

### Build
```bash
docker build -t ccb-ml-service .
```

### Run con GPU
```bash
docker run --gpus all -p 8000:8000 ccb-ml-service
```

## Testing GPU

Verificar que CUDA esté disponible:
```python
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0)}")
```

## Próximas Implementaciones

- [ ] Entrenamiento de modelos de regresión
- [ ] Entrenamiento de modelos de clasificación
- [ ] Clustering automático
- [ ] Autoencoder para detección de anomalías
- [ ] Time series forecasting con LSTM
- [ ] Transfer learning con modelos pre-entrenados
- [ ] Hyperparameter tuning automático
- [ ] Model versioning y A/B testing
- [ ] Explicabilidad de modelos (SHAP values)

## Arquitectura

```
ml_service/
├── main.py              # FastAPI app
├── models/              # Definiciones de modelos PyTorch
├── trainers/            # Lógica de entrenamiento
├── utils/               # Utilidades
├── requirements.txt     # Dependencias Python
└── Dockerfile          # Container con CUDA
```
