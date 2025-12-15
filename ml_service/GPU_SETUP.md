# Configuración GPU para ML Service

Esta guía te ayudará a configurar tu RTX 2070 Super para usar con Docker y el ML Service.

## Verificar GPU

Primero, verifica que tu GPU esté disponible:
```bash
nvidia-smi
```

Deberías ver algo como:
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx    CUDA Version: 12.2  |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce RTX 2070 SUPER   Off  | 00000000:01:00.0  On |  N/A |
```

## Instalar NVIDIA Container Toolkit

### Ubuntu/Debian

1. **Configurar repositorio**:
   ```bash
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
     sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   ```

2. **Instalar el toolkit**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nvidia-container-toolkit
   ```

3. **Reiniciar Docker**:
   ```bash
   sudo systemctl restart docker
   ```

### Verificar Instalación

Probar que Docker puede acceder a la GPU:
```bash
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

Deberías ver la misma salida de `nvidia-smi` que antes.

## Construir ML Service

```bash
cd ccb
docker compose build ml_service
```

## Ejecutar ML Service

### Con docker-compose (Recomendado)
```bash
docker compose up -d ml_service
```

### Standalone con GPU
```bash
docker run --gpus all -p 8000:8000 ccb-ml-service
```

## Verificar que ML Service usa la GPU

1. **Acceder al health endpoint**:
   ```bash
   curl http://localhost:8000/health
   ```

   Respuesta esperada:
   ```json
   {
     "status": "healthy",
     "cuda_available": true,
     "gpu": {
       "name": "NVIDIA GeForce RTX 2070 SUPER",
       "memory_allocated": "0.00 GB",
       "memory_reserved": "0.00 GB"
     },
     "pytorch_version": "2.2.0+cu121"
   }
   ```

2. **Verificar logs del contenedor**:
   ```bash
   docker logs ccb_ml_service
   ```

   Deberías ver:
   ```
   INFO: ✓ GPU Detectada: NVIDIA GeForce RTX 2070 SUPER
   INFO: ✓ CUDA Version: 12.1
   INFO: ✓ GPU Memory: 8.00 GB
   ```

## Troubleshooting

### Error: "could not select device driver nvidia"

**Solución**: Asegúrate de tener instalado `nvidia-container-toolkit`:
```bash
sudo apt-get install -y nvidia-container-toolkit
sud systemctl restart docker
```

### Error: "CUDA out of memory"

**Solución**: Reduce el `batch_size` en el entrenamiento o cierra otras aplicaciones que usen la GPU.

### GPU no detectada en contenedor

**Solución**: Verifica que estés usando `--gpus all` o la configuración `deploy.resources.reservations.devices` en docker-compose.

## Monitorear Uso de GPU

Durante el entrenamiento, puedes monitorear el uso:
```bash
watch -n 1 nvidia-smi
```

Esto actualizará cada segundo mostrando:
- Uso de memoria GPU
- Utilización de GPU (%)
- Temperatura
- Consumo de energía

## Optimizaciones RTX 2070 Super

Tu RTX 2070 Super tiene:
- **8GB VRAM**: Suficiente para modelos medianos
- **Tensor Cores**: Aceleración automática para operaciones mixtas (FP16/FP32)
- **CUDA Compute 7.5**: Compatible con las últimas features de PyTorch

### Tips para aprovechar al máximo:

1. **Usar Mixed Precision Training**:
   ```python
   from torch.cuda.amp import autocast, GradScaler
   scaler = GradScaler()
   ```

2. **Batch sizes recomendados**:
   - Modelos pequeños: 64-128
   - Modelos medianos: 32-64
   - Modelos grandes: 16-32

3. **Monitorear memoria**:
   ```python
   torch.cuda.empty_cache()  # Liberar memoria no usada
   ```

## Próximos Pasos

1. Prueba el endpoint de health check
2. Sube un dataset desde el frontend
3. Usa el endpoint `/train` para entrenar tu primer modelo
4. Monitorea el uso de GPU con `nvidia-smi`

¡Listo! Tu GPU está configurada y lista para entrenar modelos ML.
