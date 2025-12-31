"""
Trainer para modelos de regresión con soporte para datos categóricos y fechas
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SimpleRegressionModel(nn.Module):
    """Modelo de regresión simple con capas fully connected"""
    
    def __init__(self, input_dim: int, hidden_dims: List[int] = [128, 64, 32]):
        super().__init__()
        
        layers = []
        prev_dim = input_dim
        
        # Hidden layers
        for hidden_dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, hidden_dim))
            layers.append(nn.BatchNorm1d(hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.2))
            prev_dim = hidden_dim
        
        # Output layer
        layers.append(nn.Linear(prev_dim, 1))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

class RegressionTrainer:
    """Entrenador de modelos de regresión con Feature Engineering básico"""
    
    def __init__(self, device: torch.device):
        self.device = device
        self.feature_metadata = {}
    
    def prepare_data(
        self, 
        data: List[Dict], 
        target_column: str
    ) -> Tuple[torch.Tensor, torch.Tensor, List[str]]:
        """
        Prepara datos para entrenamiento con codificación de categorías y fechas
        """
        if not data:
            raise ValueError("No hay datos para entrenar")
        
        df = pd.DataFrame(data)
        
        if target_column not in df.columns:
            raise ValueError(f"Columna objetivo '{target_column}' no encontrada")

        # 1. Limpiar Target (asegurar que sea numérico)
        df[target_column] = pd.to_numeric(df[target_column], errors='coerce')
        df = df.dropna(subset=[target_column])
        
        feature_names = []
        processed_features = []

        # 2. Procesar Columnas
        for col in df.columns:
            if col == target_column or col.lower() == 'id' or col.lower().startswith('id'):
                logger.info(f"Ignorando columna de ID: {col}")
                continue
            
            # Intentar convertir fechas
            if 'fecha' in col.lower() or 'date' in col.lower():
                try:
                    dates = pd.to_datetime(df[col], errors='coerce')
                    if not dates.isna().all():
                        df[f'{col}_month'] = dates.dt.month
                        df[f'{col}_day'] = dates.dt.dayofweek
                        feature_names.extend([f'{col}_month', f'{col}_day'])
                        self.feature_metadata[col] = { 'type': 'date' }
                        logger.info(f"Fecha detectada en '{col}', extraídos mes y día.")
                        continue
                except:
                    pass

            # Intentar numérico
            is_numeric = pd.to_numeric(df[col], errors='coerce')
            if not is_numeric.isna().all():
                # Rellenar nulos con media
                df[col] = is_numeric.fillna(is_numeric.mean())
                feature_names.append(col)
                self.feature_metadata[col] = { 'type': 'numeric' }
                logger.info(f"Columna numérica detectada: {col}")
            else:
                # Categórico (Label Encoding simple)
                codes, uniques = pd.factorize(df[col])
                df[col] = codes
                self.feature_metadata[col] = {
                    'type': 'categorical',
                    'uniques': uniques.tolist()
                }
                feature_names.append(col)
                logger.info(f"Columna categórica detectada: {col} ({len(uniques)} categorías)")

        # 3. Preparar tensores finales
        X_df = df[feature_names].astype(np.float32)
        y_df = df[target_column].astype(np.float32).values.reshape(-1, 1)
        
        # Normalización (Z-Score)
        X_mean = X_df.mean()
        X_std = X_df.std() + 1e-8
        X_normalized = (X_df - X_mean) / X_std
        
        # Guardar metadatos para inferencia futura
        self.feature_metadata['stats'] = {
            'mean': X_mean.to_dict(),
            'std': X_std.to_dict()
        }

        X_tensor = torch.from_numpy(X_normalized.values).to(self.device).contiguous()
        y_tensor = torch.from_numpy(y_df).to(self.device).contiguous()
        
        logger.info(f"Datos finales: {X_tensor.shape[0]} muestras, {X_tensor.shape[1]} features")
        return X_tensor, y_tensor, feature_names
    
    def train(
        self,
        X: torch.Tensor,
        y: torch.Tensor,
        epochs: int = 100,
        learning_rate: float = 0.001,
        batch_size: int = 32
    ) -> Tuple[nn.Module, Dict]:
        """
        Entrena el modelo con los tensores preparados
        """
        input_dim = X.shape[1]
        model = SimpleRegressionModel(input_dim).to(self.device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        
        n_samples = X.shape[0]
        n_batches = (n_samples + batch_size - 1) // batch_size
        
        logger.info(f"Entrenando en {self.device}...")
        
        model.train()
        for epoch in range(epochs):
            indices = torch.randperm(n_samples)
            X_sh = X[indices]
            y_sh = y[indices]
            
            epoch_loss = 0.0
            for i in range(0, n_samples, batch_size):
                batch_X = X_sh[i:i+batch_size]
                batch_y = y_sh[i:i+batch_size]
                
                optimizer.zero_grad()
                pred = model(batch_X)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            
            if (epoch + 1) % 20 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} - Loss: {epoch_loss/n_batches:.6f}")

        # Métricas finales
        model.eval()
        with torch.no_grad():
            preds = model(X)
            final_loss = criterion(preds, y).item()
            
            # R2 Score
            ss_res = torch.sum((y - preds) ** 2).item()
            ss_tot = torch.sum((y - y.mean()) ** 2).item()
            r2_score = 1 - (ss_res / (ss_tot + 1e-8))
            
        return model, {
            'final_loss': float(final_loss),
            'r2_score': float(r2_score),
            'samples': n_samples,
            'features': input_dim,
            'metadata': self.feature_metadata
        }

