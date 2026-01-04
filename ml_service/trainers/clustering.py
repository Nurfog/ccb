"""
Trainer para Clustering (K-Means) y Reducción de Dimensionalidad (PCA)
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
import logging
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, LabelEncoder

logger = logging.getLogger(__name__)

class ClusteringTrainer:
    """Entrenador de modelos de Clustering (K-Means)"""
    
    def __init__(self):
        self.feature_metadata = {}
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=2) # 2D para visualización
        self.kmeans = None
        self.encoders = {}
        
    def _generate_cluster_name(self, centroid_scaled: np.ndarray, feature_names: List[str]) -> str:
        """Genera un nombre descriptivo basado en los valores Z del centroide"""
        # Ordenar índices por valor absoluto (mayor desviación = más característico)
        indices = np.argsort(np.abs(centroid_scaled))[::-1]
        
        # Tomar los top 2 features
        top_indices = indices[:2]
        parts = []
        
        for idx in top_indices:
            val = centroid_scaled[idx]
            feat = feature_names[idx]
            
            # Umbral de significancia (si es muy cercano a 0, no es distintivo)
            if abs(val) < 0.3: 
                continue

            # Fallback: ignorar si por alguna razón pasó un ID
            if 'id' in feat.lower():
                continue
                
            prefix = "Alto" if val > 0 else "Bajo"
            parts.append(f"{prefix} {feat}")
            
        if not parts:
            return "Promedio"
            
        return " - ".join(parts)
    
    def prepare_data(self, data: List[Dict]) -> Tuple[pd.DataFrame, List[str]]:
        """Prepara datos limpieza, encoding y scaling"""
        if not data:
            raise ValueError("No hay datos para agrupar")
            
        df = pd.DataFrame(data)
        
        # 1. Identificar columnas numéricas y categóricas
        feature_names = []
        processed_df = df.copy()
        
        # Ignorar IDs (cualquier columna que contenga 'id' insensible, excepto si es p.ej 'mid' y no queremos ser tan agresivos, pero para ejecutivo mejor limpiar)
        # Seremos agresivos: si contiene "id" y parece ser un identificador (entero unico o string unico muy variable)
        drop_cols = []
        for c in df.columns:
            if 'id' in c.lower() or c.lower() == 'id':
                drop_cols.append(c)
        
        if drop_cols:
            logger.info(f"Ignorando columnas ID para clustering: {drop_cols}")
            processed_df = processed_df.drop(columns=drop_cols)
            
        for col in processed_df.columns:
            # Fechas: ignorar o procesar (por simplicidad, ignoramos fechas crudas en clustering numérico)
            if 'date' in col.lower() or 'fecha' in col.lower():
                logger.info(f"Ignorando columna fecha para clustering: {col}")
                processed_df = processed_df.drop(columns=[col])
                continue
                
            # Numérico
            is_numeric = pd.to_numeric(processed_df[col], errors='coerce')
            if not is_numeric.isna().all():
                processed_df[col] = is_numeric.fillna(is_numeric.mean())
                feature_names.append(col)
            else:
                # Categórico: Label Encoding
                le = LabelEncoder()
                processed_df[col] = le.fit_transform(processed_df[col].astype(str))
                self.encoders[col] = le
                feature_names.append(col)
        
        # 2. Scaling
        X = processed_df[feature_names].values
        X_scaled = self.scaler.fit_transform(X)
        
        self.feature_metadata['features'] = feature_names
        return pd.DataFrame(X_scaled, columns=feature_names), feature_names

    def train(self, data: List[Dict], n_clusters: int = 3) -> Dict[str, Any]:
        """Ejecuta K-Means y PCA"""
        
        # 1. Preparar
        X_df, features = self.prepare_data(data)
        X = X_df.values
        
        # 2. K-Means
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = self.kmeans.fit_predict(X)
        
        # 3. PCA para visualización 2D
        coords_2d = self.pca.fit_transform(X)
        
        # 4. Preparar resultado visual
        points = []
        original_df = pd.DataFrame(data) # Para mostrar datos reales en tooltip
        
        for i in range(len(labels)):
            points.append({
                "x": float(coords_2d[i, 0]),
                "y": float(coords_2d[i, 1]),
                "cluster": int(labels[i]),
                # Tomamos una etiqueta representativa (ej: nombre, producto) si existe
                "label": str(original_df.iloc[i].get('nombre', original_df.iloc[i].get('producto', f"Item {i}")))
            })
            
        # 5. Métricas e Info de Clusters (Centroides interpretables)
        # Invertir scaling para mostrar valores reales en los centroides
        centroids_scaled = self.kmeans.cluster_centers_
        centroids_real = self.scaler.inverse_transform(centroids_scaled)
        
        cluster_info = []
        for i in range(n_clusters):
            # Encontrar features dominantes (más altas/bajas que la media)
            name = self._generate_cluster_name(centroids_scaled[i], features)
            
            info = {
                "id": i,
                "name": name,
                "count": int(np.sum(labels == i)),
                "center": dict(zip(features, centroids_real[i].tolist()))
            }
            cluster_info.append(info)

        return {
            "points": points,
            "clusters": cluster_info,
            "explained_variance": float(np.sum(self.pca.explained_variance_ratio_)),
            "features": features
        }
