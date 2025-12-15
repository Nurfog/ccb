from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import os
from typing import List, Dict, Any
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CCB ML Service", version="1.0.0")

# Configurar dispositivo (GPU/CPU)
# Prioridad: 1. Variable de entorno ML_DEVICE, 2. Autodetección
ML_DEVICE_ENV = os.getenv("ML_DEVICE", "auto").lower()

if ML_DEVICE_ENV == "auto":
    CUDA_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device("cuda" if CUDA_AVAILABLE else "cpu")
    logger.info("🔍 Modo autodetección activado")
elif ML_DEVICE_ENV == "cuda":
    if torch.cuda.is_available():
        CUDA_AVAILABLE = True
        DEVICE = torch.device("cuda")
        logger.info("🎯 Forzando uso de GPU (configuración manual)")
    else:
        logger.warning("⚠ GPU solicitada pero no disponible, usando CPU")
        CUDA_AVAILABLE = False
        DEVICE = torch.device("cpu")
elif ML_DEVICE_ENV == "cpu":
    CUDA_AVAILABLE = False
    DEVICE = torch.device("cpu")
    logger.info("🎯 Forzando uso de CPU (configuración manual)")
else:
    logger.warning(f"⚠ ML_DEVICE inválido '{ML_DEVICE_ENV}', usando autodetección")
    CUDA_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device("cuda" if CUDA_AVAILABLE else "cpu")

if CUDA_AVAILABLE:
    logger.info(f"✓ GPU Detectada: {torch.cuda.get_device_name(0)}")
    logger.info(f"✓ CUDA Version: {torch.version.cuda}")
    logger.info(f"✓ GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
else:
    logger.info("ℹ Usando CPU para procesamiento ML")

# Modelos
class TrainRequest(BaseModel):
    schema_id: str
    model_type: str = "regression"  # regression, classification, clustering
    hyperparameters: Dict[str, Any] = {}

class PredictRequest(BaseModel):
    model_id: str
    data: List[Dict[str, Any]]

class ModelInfo(BaseModel):
    id: str
    type: str
    status: str
    accuracy: float = None
    created_at: str

@app.get("/")
async def root():
    return {
        "service": "CCB ML Service",
        "status": "operational",
        "cuda_available": CUDA_AVAILABLE,
        "device": str(DEVICE),
        "gpu_name": torch.cuda.get_device_name(0) if CUDA_AVAILABLE else None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    gpu_info = {}
    if CUDA_AVAILABLE:
        gpu_info = {
            "name": torch.cuda.get_device_name(0),
            "memory_allocated": f"{torch.cuda.memory_allocated(0) / 1e9:.2f} GB",
            "memory_reserved": f"{torch.cuda.memory_reserved(0) / 1e9:.2f} GB",
        }
    
    return {
        "status": "healthy",
        "cuda_available": CUDA_AVAILABLE,
        "gpu": gpu_info,
        "pytorch_version": torch.__version__
    }

@app.post("/train")
async def train_model(request: TrainRequest):
    """
    Entrena un modelo de ML con los datos del schema especificado
    """
    import psycopg2
    from trainers.regression import RegressionTrainer
    import json
    import uuid
    from datetime import datetime
    
    try:
        logger.info(f"Iniciando entrenamiento: {request.model_type} para schema {request.schema_id}")
        
        # Conectar a PostgreSQL
        db_url = os.getenv("DATABASE_URL", "postgres://user:password@db:5432/ml_db")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 1. Obtener datos del schema
        cursor.execute("""
            SELECT data FROM ml_data 
            WHERE schema_id = %s
            LIMIT 10000
        """, (request.schema_id,))
        
        rows = cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No se encontraron datos para ese schema")
        
        # Convertir JSONB a dict
        data = [row[0] for row in rows]
        logger.info(f"Cargadas {len(data)} filas de datos")
        
        # 2. Obtener información del schema (columnas)
        cursor.execute("""
            SELECT columns FROM ml_schemas 
            WHERE id = %s
        """, (request.schema_id,))
        
        schema_info = cursor.fetchone()
        if not schema_info:
            raise HTTPException(status_code=404, detail="Schema no encontrado")
        
        columns = schema_info[0]  # Lista de nombres de columnas
        logger.info(f"Columnas disponibles: {columns}")
        
        # 3. Determinar target column (hiperparámetro o última columna)
        target_column = request.hyperparameters.get("target_column")
        if not target_column:
            # Usar última columna por defecto
            target_column = columns[-1] if isinstance(columns, list) else list(columns.keys())[-1]
        
        logger.info(f"Columna objetivo: {target_column}")
        
        # 4. Entrenar modelo
        if request.model_type == "regression":
            trainer = RegressionTrainer(DEVICE)
            
            X, y, feature_names = trainer.prepare_data(data, target_column)
            
            # Hiperparámetros
            epochs = request.hyperparameters.get("epochs", 100)
            learning_rate = request.hyperparameters.get("learning_rate", 0.001)
            batch_size = request.hyperparameters.get("batch_size", 32)
            
            model, metrics = trainer.train(
                X, y,
                epochs=epochs,
                learning_rate=learning_rate,
                batch_size=batch_size
            )
            
            # 5. Guardar modelo
            model_id = str(uuid.uuid4())
            model_path = f"/app/models/{model_id}.pt"
            
            os.makedirs("/app/models", exist_ok=True)
            torch.save({
                'model_state': model.state_dict(),
                'feature_names': feature_names,
                'target_column': target_column,
                'metrics': metrics,
                'hyperparameters': {
                    'epochs': epochs,
                    'learning_rate': learning_rate,
                    'batch_size': batch_size
                }
            }, model_path)
            
            logger.info(f"Modelo guardado: {model_path}")
            
            # 6. Registrar modelo en base de datos (opcional, por ahora solo log)
            
            cursor.close()
            conn.close()
            
            return {
                "model_id": model_id,
                "status": "training_complete",
                "message": "Modelo entrenado exitosamente",
                "device": str(DEVICE),
                "metrics": metrics,
                "feature_names": feature_names,
                "target_column": target_column
            }
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de modelo '{request.model_type}' no soportado aún")
    
    except psycopg2.Error as e:
        logger.error(f"Error de base de datos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        logger.error(f"Error en entrenamiento: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(request: PredictRequest):
    """
    Realiza predicciones usando un modelo entrenado
    """
    try:
        # TODO: Implementar predicción real
        # 1. Cargar modelo desde disco/DB
        # 2. Preprocesar input data
        # 3. Ejecutar inferencia
        # 4. Post-procesar resultados
        
        logger.info(f"Predicción solicitada para modelo: {request.model_id}")
        
        # Placeholder response
        return {
            "predictions": [{"value": 0.0} for _ in request.data],
            "model_id": request.model_id,
            "device": str(DEVICE)
        }
    
    except Exception as e:
        logger.error(f"Error en predicción: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """
    Lista todos los modelos entrenados
    """
    # TODO: Consultar base de datos de modelos
    return {
        "models": [],
        "count": 0
    }

@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """
    Elimina un modelo entrenado
    """
    # TODO: Eliminar modelo de disco y DB
    return {
        "message": f"Modelo {model_id} eliminado",
        "success": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
