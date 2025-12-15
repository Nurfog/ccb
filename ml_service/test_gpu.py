#!/usr/bin/env python3
"""
Script de prueba para verificar la configuración de GPU y PyTorch
"""

import sys

def check_pytorch():
    print("=" * 50)
    print("Verificando PyTorch...")
    print("=" * 50)
    
    try:
        import torch
        print(f"✓ PyTorch instalado: {torch.__version__}")
    except ImportError:
        print("✗ PyTorch no está instalado")
        return False
    return True

def check_cuda():
    print("\n" + "=" * 50)
    print("Verificando CUDA...")
    print("=" * 50)
    
    import torch
    
    if torch.cuda.is_available():
        print(f"✓ CUDA disponible")
        print(f"✓ Versión CUDA: {torch.version.cuda}")
        print(f"✓ cuDNN: {torch.backends.cudnn.version()}")
        print(f"✓ Dispositivos GPU: {torch.cuda.device_count()}")
        
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            print(f"\n  GPU {i}: {torch.cuda.get_device_name(i)}")
            print(f"    - Memoria Total: {props.total_memory / 1e9:.2f} GB")
            print(f"    - Compute Capability: {props.major}.{props.minor}")
            print(f"    - Multiprocessors: {props.multi_processor_count}")
    else:
        print("✗ CUDA no disponible")
        print("  El entrenamiento usará CPU (más lento)")
        return False
    return True

def test_tensor_operations():
    print("\n" + "=" * 50)
    print("Probando operaciones con tensores...")
    print("=" * 50)
    
    import torch
    import time
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Dispositivo seleccionado: {device}")
    
    # Crear tensores grandes
    size = 5000
    a = torch.randn(size, size, device=device)
    b = torch.randn(size, size, device=device)
    
    # Medir tiempo de multiplicación de matrices
    start = time.time()
    c = torch.matmul(a, b)
    torch.cuda.synchronize() if device.type == 'cuda' else None
    elapsed = time.time() - start
    
    print(f"✓ Multiplicación de matrices {size}x{size}: {elapsed:.4f}s")
    
    if device.type == 'cuda':
        print(f"✓ Memoria GPU usada: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
        print(f"✓ Memoria GPU reservada: {torch.cuda.memory_reserved() / 1e9:.2f} GB")

def test_simple_training():
    print("\n" + "=" * 50)
    print("Probando entrenamiento simple...")
    print("=" * 50)
    
    import torch
    import torch.nn as nn
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Modelo simple
    model = nn.Sequential(
        nn.Linear(10, 50),
        nn.ReLU(),
        nn.Linear(50, 1)
    ).to(device)
    
    # Datos sintéticos
    x = torch.randn(100, 10, device=device)
    y = torch.randn(100, 1, device=device)
    
    # Entrenamiento
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    print("Entrenando...")
    for epoch in range(5):
        optimizer.zero_grad()
        output = model(x)
        loss = criterion(output, y)
        loss.backward()
        optimizer.step()
        print(f"  Epoch {epoch+1}/5 - Loss: {loss.item():.4f}")
    
    print("✓ Entrenamiento completado exitosamente")

def main():
    print("\n" + "=" * 50)
    print("CCB ML Service - Verificación de Sistema")
    print("=" * 50)
    
    if not check_pytorch():
        print("\n⚠ Instala PyTorch primero: pip install torch")
        sys.exit(1)
    
    cuda_available = check_cuda()
    
    try:
        test_tensor_operations()
        test_simple_training()
    except Exception as e:
        print(f"\n✗ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n" + "=" * 50)
    if cuda_available:
        print("✓ Todo funcionando correctamente con GPU")
    else:
        print("✓ Sistema funcional (usando CPU)")
    print("=" * 50)

if __name__ == "__main__":
    main()
