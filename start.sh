#!/bin/bash
# Script para iniciar servicios correctamente con soporte GPU

echo "🚀 Iniciando servicios (Perfil GPU)..."
docker compose --profile gpu up -d --build

echo ""
echo "✅ Servicios iniciados:"
echo "   - Frontend: http://localhost:8080"
echo "   - Backend:  http://localhost:3004"
echo "   - ML GPU:   http://localhost:8004"
