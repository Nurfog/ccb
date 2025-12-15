"""
Trainer para modelos de regresión
"""
import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class SimpleRegressionModel(nn.Module):
    """Modelo de regresión simple con capas fully connected"""
    
    def __init__(self, input_dim: int, hidden_dims: List[int] = [64, 32]):
        super().__init__()
        
        layers = []
        prev_dim = input_dim
        
        # Hidden layers
        for hidden_dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.2))
            prev_dim = hidden_dim
        
        # Output layer
        layers.append(nn.Linear(prev_dim, 1))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

class RegressionTrainer:
    """Entrenador de modelos de regresión"""
    
    def __init__(self, device: torch.device):
        self.device = device
    
    def prepare_data(
        self, 
        data: List[Dict], 
        target_column: str
    ) -> Tuple[torch.Tensor, torch.Tensor, List[str]]:
        """
        Prepara datos para entrenamiento
        
        Args:
            data: Lista de diccionarios con los datos
            target_column: Nombre de la columna objetivo
            
        Returns:
            X_tensor, y_tensor, feature_names
        """
        if not data:
            raise ValueError("No hay datos para entrenar")
        
        # Identificar columnas numéricas (excluyendo target)
        first_row = data[0]
        feature_names = []
        
        for key, value in first_row.items():
            if key != target_column:
                try:
                    float(value)
                    feature_names.append(key)
                except (ValueError, TypeError):
                    logger.warning(f"Columna '{key}' no es numérica, ignorando")
        
        if not feature_names:
            raise ValueError("No se encontraron features numéricas")
        
        # Extraer features y target
        X = []
        y = []
        
        for row in data:
            try:
                features = [float(row.get(fname, 0)) for fname in feature_names]
                target = float(row.get(target_column, 0))
                X.append(features)
                y.append(target)
            except (ValueError, TypeError) as e:
                logger.warning(f"Error procesando fila: {e}")
                continue
        
        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.float32).reshape(-1, 1)
        
        # Normalizar features
        X_mean = X.mean(axis=0)
        X_std = X.std(axis=0) + 1e-8
        X = (X - X_mean) / X_std
        
        # Convertir a tensors
        X_tensor = torch.from_numpy(X).to(self.device)
        y_tensor = torch.from_numpy(y).to(self.device)
        
        logger.info(f"Datos preparados: {X_tensor.shape[0]} samples, {X_tensor.shape[1]} features")
        
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
        Entrena un modelo de regresión
        
        Returns:
            model, metrics
        """
        input_dim = X.shape[1]
        model = SimpleRegressionModel(input_dim).to(self.device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        
        n_samples = X.shape[0]
        n_batches = (n_samples + batch_size - 1) // batch_size
        
        history = {
            'loss': [],
            'epoch': []
        }
        
        logger.info(f"Iniciando entrenamiento: {epochs} epochs, {n_samples} samples, batch_size={batch_size}")
        
        model.train()
        for epoch in range(epochs):
            epoch_loss = 0.0
            
            # Shuffle data
            indices = torch.randperm(n_samples)
            X_shuffled = X[indices]
            y_shuffled = y[indices]
            
            for i in range(0, n_samples, batch_size):
                batch_X = X_shuffled[i:i+batch_size]
                batch_y = y_shuffled[i:i+batch_size]
                
                optimizer.zero_grad()
                predictions = model(batch_X)
                loss = criterion(predictions, batch_y)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
            
            avg_loss = epoch_loss / n_batches
            history['loss'].append(avg_loss)
            history['epoch'].append(epoch)
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.6f}")
        
        # Calcular métricas finales
        model.eval()
        with torch.no_grad():
            final_predictions = model(X)
            final_loss = criterion(final_predictions, y).item()
            
            # R² score
            ss_res = torch.sum((y - final_predictions) ** 2).item()
            ss_tot = torch.sum((y - y.mean()) ** 2).item()
            r2_score = 1 - (ss_res / ss_tot)
        
        metrics = {
            'final_loss': final_loss,
            'r2_score': r2_score,
            'epochs_trained': epochs,
            'samples': n_samples,
            'features': input_dim
        }
        
        logger.info(f"Entrenamiento completado - Loss: {final_loss:.6f}, R²: {r2_score:.4f}")
        
        return model, metrics
