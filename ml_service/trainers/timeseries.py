"""
Trainer para modelos de series de tiempo (LSTM)
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class LSTMModel(nn.Module):
    """Modelo LSTM para predicción de series de tiempo"""
    
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )
    
    def forward(self, x):
        # x shape: [batch_size, seq_len, input_dim]
        # output shape: [batch_size, seq_len, hidden_dim]
        # hidden state: [num_layers, batch_size, hidden_dim]
        output, (hn, cn) = self.lstm(x)
        
        # Usamos el estado oculto del último paso de tiempo para predecir
        # hn[-1] shape: [batch_size, hidden_dim]
        out = self.fc(hn[-1])
        return out

class TimeSeriesTrainer:
    """Entrenador de modelos LSTM con ventanas deslizantes"""
    
    def __init__(self, device: torch.device):
        self.device = device
        self.feature_metadata = {}
    
    def create_sequences(self, data: np.ndarray, seq_length: int) -> Tuple[np.ndarray, np.ndarray]:
        """Crea secuencias input/output para LSTM"""
        xs = []
        ys = []
        for i in range(len(data) - seq_length):
            x = data[i:(i + seq_length)]
            y = data[i + seq_length] # Predecir el siguiente paso (solo target será usado)
            xs.append(x)
            ys.append(y)
        return np.array(xs), np.array(ys)

    def prepare_data(
        self, 
        data: List[Dict], 
        target_column: str,
        date_column: str,
        sequence_length: int = 30
    ) -> Tuple[torch.Tensor, torch.Tensor, List[str]]:
        """
        Prepara datos secuenciales ordenados por fecha
        """
        if not data:
            raise ValueError("No hay datos para entrenar")
        
        df = pd.DataFrame(data)
        
        if target_column not in df.columns:
            raise ValueError(f"Columna objetivo '{target_column}' no encontrada")
        if date_column not in df.columns:
            raise ValueError(f"Columna de fecha '{date_column}' no encontrada")

        # 1. Ordenar por fecha
        df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
        df = df.dropna(subset=[date_column]).sort_values(by=date_column)
        
        # 2. Limpiar Target
        df[target_column] = pd.to_numeric(df[target_column], errors='coerce')
        df = df.dropna(subset=[target_column])

        # 3. Guardar stats para normalización inversa
        target_mean = df[target_column].mean()
        target_std = df[target_column].std() + 1e-8
        
        self.feature_metadata['stats'] = {
            'target_mean': float(target_mean),
            'target_std': float(target_std),
            'sequence_length': sequence_length,
            'features': [target_column] # Por ahora univariado (solo predecimos basado en el pasado de la misma variable)
        }
        
        # 4. Normalizar
        data_norm = (df[target_column].values - target_mean) / target_std
        data_norm = data_norm.reshape(-1, 1) # [n_samples, 1] (univariado por ahora)
        
        # 5. Crear secuencias
        X, y = self.create_sequences(data_norm, sequence_length)
        
        if len(X) == 0:
            raise ValueError(f"No hay suficientes datos para crear secuencias de largo {sequence_length}")

        X_tensor = torch.from_numpy(X).float().to(self.device)
        y_tensor = torch.from_numpy(y).float().to(self.device)
        
        logger.info(f"Secuencias creadas: {X_tensor.shape[0]}. Input shape: {X_tensor.shape}")
        return X_tensor, y_tensor, [target_column]
    
    def train(
        self,
        X: torch.Tensor,
        y: torch.Tensor,
        epochs: int = 100,
        learning_rate: float = 0.001,
        batch_size: int = 32
    ) -> Tuple[nn.Module, Dict]:
        
        input_dim = X.shape[2] # [Batch, Seq, Features]
        model = LSTMModel(input_dim=input_dim).to(self.device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        
        n_samples = X.shape[0]
        n_batches = (n_samples + batch_size - 1) // batch_size
        
        logger.info(f"Entrenando LSTM en {self.device}...")
        
        model.train()
        for epoch in range(epochs):
            # No barajamos temporalmente para mantener cierta coherencia si usáramos stateful LSTM,
            # pero para stateless (default) se puede barajar. Para TS puro mejor no barajar a veces.
            # Aquí barajaremos para evitar sesgos de batch.
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
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} - Loss: {epoch_loss/n_batches:.6f}")

        # Métricas finales
        model.eval()
        with torch.no_grad():
            preds = model(X)
            final_loss = criterion(preds, y).item()
            
            # R2 Score (aproximado)
            ss_res = torch.sum((y - preds) ** 2).item()
            ss_tot = torch.sum((y - y.mean()) ** 2).item()
            r2_score = 1 - (ss_res / (ss_tot + 1e-8))
            
            # Generate Fan Chart Data
            # Tomamos la última secuencia conocida para proyectar desde ahí
            last_seq = X[-1:].clone() # [1, seq, 1]
            last_val_norm = y[-1].item()
            
            # Estimamos sigma (RMSE en datos normalizados)
            rmse_norm = np.sqrt(ss_res / n_samples)
            
            fan_data = self._generate_fan_chart_data(
                model, 
                last_seq, 
                last_val_norm, 
                steps=30, 
                sigma=rmse_norm, 
                meta=self.feature_metadata
            )
            
            # Add History (Recent actuals for context)
            # Tomamos los últimos 50 puntos de y (o todos si son menos)
            history_len = min(50, len(y))
            history_vals_norm = y[-history_len:].cpu().numpy().flatten()
            history_real = [(v * self.feature_metadata['stats']['target_std']) + self.feature_metadata['stats']['target_mean'] for v in history_vals_norm]
            
            fan_data['history'] = history_real
            
        return model, {
            'mse': float(final_loss),
            'r2_score': float(r2_score),
            'samples': n_samples,
            'features': input_dim,
            'metadata': self.feature_metadata,
            'fan_chart_data': fan_data
        }

    def _generate_fan_chart_data(self, model: nn.Module, X_last: torch.Tensor, last_real_val: float, steps: int = 30, sigma: float = 0.0, meta: Dict = {}) -> Dict:
        """
        Genera prohibición a futuro con intervalos de confianza
        X_last: [1, seq_len, input_dim]
        """
        model.eval()
        forecasts = []
        current_seq = X_last.clone() # [1, seq, 1]
        
        # Desnormalizar params
        mean = meta['stats']['target_mean']
        std = meta['stats']['target_std']

        # Future Predictions (Recursive)
        with torch.no_grad():
            for _ in range(steps):
                pred = model(current_seq) # [1, 1]
                val = pred.item()
                forecasts.append(val)
                
                # Update sequence: shift left and append new prediction
                # current_seq: [1, seq, 1]
                new_step = torch.tensor([[[val]]], device=self.device)
                current_seq = torch.cat((current_seq[:, 1:, :], new_step), dim=1)
        
        # Build Chart Data
        chart_data = []
        
        # 1. Forecast points with confidence intervals
        # sigma is in normalized scale. Convert to real scale:
        sigma_real = sigma * std
        
        for i, val_norm in enumerate(forecasts):
            val_real = (val_norm * std) + mean
            
            # Uncertainty grows with time (square root of time rule of thumb for random walks, or linear for simplicity here)
            # A simple approach: constant uncertainty based on model error + slight growth factor
            growth = np.sqrt(i + 1)
            uncertainty = sigma_real * growth 
            
            chart_data.append({
                "step": i + 1,
                "type": "forecast",
                "value": val_real,
                "upper_1sigma": val_real + uncertainty,
                "lower_1sigma": val_real - uncertainty,
                "upper_2sigma": val_real + (uncertainty * 1.96),
                "lower_2sigma": val_real - (uncertainty * 1.96)
            })
            
        return {
            "forecast": chart_data,
            "sigma_real": sigma_real
        }

    def _generate_fan_chart_data(self, model: nn.Module, X_last: torch.Tensor, last_real_val: float, steps: int = 30, sigma: float = 0.0, meta: Dict = {}) -> Dict:
        """
        Genera prohibición a futuro con intervalos de confianza
        X_last: [1, seq_len, input_dim]
        """
        model.eval()
        forecasts = []
        current_seq = X_last.clone() # [1, seq, 1]
        
        # Desnormalizar params
        mean = meta['stats']['target_mean']
        std = meta['stats']['target_std']

        # Future Predictions (Recursive)
        with torch.no_grad():
            for _ in range(steps):
                pred = model(current_seq) # [1, 1]
                val = pred.item()
                forecasts.append(val)
                
                # Update sequence: shift left and append new prediction
                # current_seq: [1, seq, 1]
                new_step = torch.tensor([[[val]]], device=self.device)
                current_seq = torch.cat((current_seq[:, 1:, :], new_step), dim=1)
        
        # Build Chart Data
        chart_data = []
        
        # 1. Forecast points with confidence intervals
        # sigma is in normalized scale. Convert to real scale:
        sigma_real = sigma * std
        
        for i, val_norm in enumerate(forecasts):
            val_real = (val_norm * std) + mean
            
            # Uncertainty grows with time (square root of time rule of thumb for random walks, or linear for simplicity here)
            # A simple approach: constant uncertainty based on model error + slight growth factor
            growth = np.sqrt(i + 1)
            uncertainty = sigma_real * growth 
            
            chart_data.append({
                "step": i + 1,
                "type": "forecast",
                "value": val_real,
                "upper_1sigma": val_real + uncertainty,
                "lower_1sigma": val_real - uncertainty,
                "upper_2sigma": val_real + (uncertainty * 1.96),
                "lower_2sigma": val_real - (uncertainty * 1.96)
            })
            
        return {
            "forecast": chart_data,
            "sigma_real": sigma_real
        }
