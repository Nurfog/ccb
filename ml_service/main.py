from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import os
import json
import uuid
from typing import List, Dict, Any
import logging
import psycopg2
from datetime import datetime
import pandas as pd
from trainers.regression import RegressionTrainer, SimpleRegressionModel

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CCB ML Service", version="1.0.0")

# Configurar dispositivo (GPU/CPU)
ML_DEVICE_ENV = os.getenv("ML_DEVICE", "auto").lower()

if ML_DEVICE_ENV == "auto":
    CUDA_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device("cuda" if CUDA_AVAILABLE else "cpu")
elif ML_DEVICE_ENV == "cuda":
    DEVICE = torch.device("cuda")
    CUDA_AVAILABLE = True
else:
    DEVICE = torch.device("cpu")
    CUDA_AVAILABLE = False

logger.info(f"Usando dispositivo: {DEVICE}")

# DB Settings
DB_URL = os.getenv("DATABASE_URL", "postgres://user:password@db:5432/ml_db")

# Pydantic Models
class TrainRequest(BaseModel):
    schema_id: str
    model_type: str = "regression"
    hyperparameters: Dict[str, Any] = {}

class PredictRequest(BaseModel):
    model_id: str
    data: List[Dict[str, Any]]

@app.get("/")
async def root():
    return {"service": "CCB ML Service", "cuda": CUDA_AVAILABLE, "device": str(DEVICE)}

@app.get("/health")
async def health():
    return {"status": "healthy", "device": str(DEVICE)}

@app.post("/train")
async def train_model(request: TrainRequest):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # 1. Obtener datos y client_id
        cursor.execute("SELECT client_id, columns FROM ml_schemas WHERE id = %s", (request.schema_id,))
        schema_info = cursor.fetchone()
        if not schema_info:
            raise HTTPException(status_code=404, detail="Schema no encontrado")
        
        client_id, columns = schema_info
        
        cursor.execute("SELECT data FROM ml_data WHERE schema_id = %s LIMIT 10000", (request.schema_id,))
        data = [row[0] for row in cursor.fetchall()]
        
        if not data:
            raise HTTPException(status_code=404, detail="No hay datos")

        target_column = request.hyperparameters.get("target_column") or columns[-1]
        
        # 2. Entrenar
        if request.model_type == "regression":
            trainer = RegressionTrainer(DEVICE)
            X, y, feature_names = trainer.prepare_data(data, target_column)
            
            epochs = int(request.hyperparameters.get("epochs", 100))
            lr = float(request.hyperparameters.get("learning_rate", 0.001))
            bs = int(request.hyperparameters.get("batch_size", 32))
            
            model, metrics = trainer.train(X, y, epochs=epochs, learning_rate=lr, batch_size=bs)
            
            # 3. Guardar en disco
            model_id = str(uuid.uuid4())
            model_path = f"/app/models/{model_id}.pt"
            os.makedirs("/app/models", exist_ok=True)
            
            torch.save({
                'model_state': model.state_dict(),
                'feature_names': feature_names,
                'target_column': target_column,
                'metadata': trainer.feature_metadata
            }, model_path)
            
            # 4. Registrar en DB
            cursor.execute("""
                INSERT INTO ml_models (id, schema_id, client_id, model_type, model_path, metrics, feature_metadata, target_column)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                model_id, request.schema_id, client_id, request.model_type, 
                model_path, json.dumps(metrics), json.dumps(trainer.feature_metadata), target_column
            ))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {"model_id": model_id, "metrics": metrics, "device": str(DEVICE)}
        
        raise HTTPException(status_code=400, detail="Tipo de modelo no soportado")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict(request: PredictRequest):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT model_path, feature_metadata, target_column FROM ml_models WHERE id = %s", (request.model_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Modelo no encontrado")
        
        model_path, metadata, target_col = row
        checkpoint = torch.load(model_path, map_location=DEVICE)
        
        # Reconstruir modelo
        feature_names = checkpoint['feature_names']
        input_dim = len(feature_names)
        model = SimpleRegressionModel(input_dim).to(DEVICE)
        model.load_state_dict(checkpoint['model_state'])
        model.eval()
        
        # Preprocesar input
        df = pd.DataFrame(request.data)
        
        # Aplicar mismas transformaciones que en el entrenamiento
        for col, meta in metadata.items():
            if col == 'stats' or col not in df.columns: continue
            if meta['type'] == 'categorical':
                uniques = meta['uniques']
                df[col] = df[col].apply(lambda x: uniques.index(x) if x in uniques else -1)
        
        # Fechas si existen
        for col in df.columns:
            if 'fecha' in col.lower() or 'date' in col.lower():
                dates = pd.to_datetime(df[col], errors='coerce')
                df[f'{col}_month'] = dates.dt.month.fillna(1)
                df[f'{col}_day'] = dates.dt.dayofweek.fillna(0)

        # Seleccionar features y normalizar
        stats = metadata['stats']
        X_df = df[feature_names].astype('float32')
        for col in feature_names:
            mean = stats['mean'][col]
            std = stats['std'][col]
            X_df[col] = (X_df[col] - mean) / (std + 1e-8)
            
        X_tensor = torch.from_numpy(X_df.values).to(DEVICE)
        
        with torch.no_grad():
            preds = model(X_tensor).cpu().numpy().flatten().tolist()
            
        cursor.close()
        conn.close()
        return {"predictions": preds, "model_id": request.model_id}
        
    except Exception as e:
        logger.error(f"Error predicción: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models(client_id: str = None):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        if client_id:
            cursor.execute("SELECT id, schema_id, model_type, metrics, target_column, created_at FROM ml_models WHERE client_id = %s ORDER BY created_at DESC", (client_id,))
        else:
            cursor.execute("SELECT id, schema_id, model_type, metrics, target_column, created_at FROM ml_models ORDER BY created_at DESC")
        
        models = []
        for r in cursor.fetchall():
            models.append({
                "id": r[0], "schema_id": r[1], "type": r[2], 
                "metrics": r[3], "target": r[4], "created_at": r[5].isoformat()
            })
        cursor.close()
        conn.close()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}")
async def get_model_details(model_id: str):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT id, schema_id, model_type, metrics, feature_metadata, target_column, created_at FROM ml_models WHERE id = %s", (model_id,))
        r = cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Modelo no encontrado")
        
        res = {
            "id": r[0], "schema_id": r[1], "type": r[2], 
            "metrics": r[3], "feature_metadata": r[4], "target": r[5], "created_at": r[6].isoformat()
        }
        cursor.close()
        conn.close()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT model_path FROM ml_models WHERE id = %s", (model_id,))
        row = cursor.fetchone()
        if row and os.path.exists(row[0]):
            os.remove(row[0])
        
        cursor.execute("DELETE FROM ml_models WHERE id = %s", (model_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
