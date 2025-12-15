#!/bin/bash

# Script auxiliar para gestionar ML Service en modo GPU o CPU

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  CCB ML Service Manager${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

function check_gpu() {
    echo -e "${YELLOW}Verificando GPU...${NC}"
    
    if command -v nvidia-smi &> /dev/null; then
        if nvidia-smi &> /dev/null; then
            GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader)
            echo -e "${GREEN}✓ GPU detectada: $GPU_NAME${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}⚠ No se detectó GPU NVIDIA${NC}"
    return 1
}

function check_nvidia_docker() {
    echo -e "${YELLOW}Verificando NVIDIA Container Toolkit...${NC}"
    
    if docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
        echo -e "${GREEN}✓ NVIDIA Container Toolkit configurado correctamente${NC}"
        return 0
    else
        echo -e "${RED}✗ NVIDIA Container Toolkit no disponible${NC}"
        echo -e "${YELLOW}  Instálalo siguiendo: ml_service/GPU_SETUP.md${NC}"
        return 1
    fi
}

function start_cpu() {
    echo -e "${BLUE}Iniciando ML Service en modo CPU...${NC}"
    docker compose down ml_service_gpu 2>/dev/null || true
    docker compose up -d ml_service
    echo -e "${GREEN}✓ ML Service iniciado en modo CPU${NC}"
}

function start_gpu() {
    echo -e "${BLUE}Iniciando ML Service en modo GPU...${NC}"
    
    if ! check_gpu; then
        echo -e "${RED}No se puede iniciar en modo GPU sin GPU disponible${NC}"
        echo -e "${YELLOW}¿Deseas iniciar en modo CPU? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            start_cpu
        fi
        return 1
    fi
    
    if ! check_nvidia_docker; then
        echo -e "${RED}Configura NVIDIA Container Toolkit antes de continuar${NC}"
        return 1
    fi
    
    docker compose down ml_service 2>/dev/null || true
    docker compose --profile gpu up -d ml_service_gpu
    echo -e "${GREEN}✓ ML Service iniciado en modo GPU${NC}"
}

function status() {
    echo -e "${BLUE}Estado del ML Service:${NC}"
    echo ""
    
    if docker ps | grep -q ccb_ml_service; then
        echo -e "${GREEN}✓ Servicio corriendo${NC}"
        
        # Verificar modo
        echo ""
        echo -e "${YELLOW}Consultando dispositivo...${NC}"
        sleep 2  # Esperar a que el servicio esté listo
        
        HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "{}")
        
        if echo "$HEALTH" | jq -e '.cuda_available' &>/dev/null; then
            if echo "$HEALTH" | jq -e '.cuda_available == true' &>/dev/null; then
                GPU_NAME=$(echo "$HEALTH" | jq -r '.gpu.name')
                echo -e "${GREEN}✓ Modo: GPU${NC}"
                echo -e "  GPU: ${BLUE}$GPU_NAME${NC}"
            else
                echo -e "${YELLOW}✓ Modo: CPU${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ No se pudo consultar el estado (servicio iniciando?)${NC}"
        fi
    else
        echo -e "${RED}✗ Servicio detenido${NC}"
    fi
}

function usage() {
    echo "Uso: $0 {cpu|gpu|status|help}"
    echo ""
    echo "Comandos:"
    echo "  cpu     - Inicia ML Service en modo CPU"
    echo "  gpu     - Inicia ML Service en modo GPU (requiere NVIDIA GPU)"
    echo "  status  - Muestra el estado actual del servicio"
    echo "  help    - Muestra esta ayuda"
    echo ""
}

# Main
print_header

case "${1:-status}" in
    cpu)
        start_cpu
        ;;
    gpu)
        start_gpu
        ;;
    status)
        status
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo -e "${RED}Comando desconocido: $1${NC}"
        echo ""
        usage
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Tip: Usa '${GREEN}curl http://localhost:8000/health${BLUE}' para verificar el estado${NC}"
