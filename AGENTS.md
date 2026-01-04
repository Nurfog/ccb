# CCB Development Guidelines for Agentic Coding

This document provides build commands, code style guidelines, and development patterns for agentic coding agents working in the CCB multitenancy ML platform repository.

## 🏗️ Build, Test, and Lint Commands

### Frontend (React + Vite)
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Linting
npm run lint

# Preview production build
npm run preview
```

### Backend (Rust + Axum)
```bash
cd backend

# Build
cargo build

# Run development server
cargo run

# Run tests
cargo test

# Run single test
cargo test test_name

# Run tests with output
cargo test -- --nocapture

# Format code
cargo fmt

# Check code without building
cargo check

# Apply database migrations
cargo sqlx migrate run

# Prepare queries offline
cargo sqlx prepare --workspace
```

### ML Service (Python + FastAPI)
```bash
cd ml_service

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test GPU configuration
python test_gpu.py

# Install dependencies
pip install -r requirements.txt
```

### Docker Services
```bash
# Start all services with GPU support
./start.sh

# Or manually
docker compose --profile gpu up -d --build

# Rebuild specific service
docker compose up -d --build backend
docker compose up -d --build frontend
docker compose up -d --build ml_service
```

## 🎨 Code Style Guidelines

### Frontend (React/JavaScript)

#### Imports and Dependencies
- Use ES6 imports/exports exclusively
- Group imports in this order:
  1. React and core libraries
  2. Third-party libraries (lucide-react, react-router, etc.)
  3. Local components and context
  4. Utility functions and hooks
```javascript
// ✅ Correct import order
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Users, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardCharts from '../components/DashboardCharts';
```

#### Component Structure
- Use functional components with hooks
- Component names in PascalCase
- File names in PascalCase with .jsx extension
- Export as default: `export default function ComponentName()`
- Props interface defined at top when using TypeScript (not currently used)

#### State Management
- Use `useState` for local state
- Use `useAuth` context for authentication state
- Use `useTranslation` for i18n
- Initialize loading states: `const [loading, setLoading] = useState(true);`

#### Styling Conventions
- Use inline styles with camelCase properties
- Follow CSS-in-JS pattern with objects
- Use CSS variables from design system: `background: '#0f172a'`
- Responsive design with conditional rendering

#### Error Handling
- Use try-catch blocks for async operations
- Set loading to false in finally blocks
- Console error for debugging: `console.error("Error message", error);`
- User feedback through state or UI

### Backend (Rust)

#### Imports and Dependencies
- Group imports by category:
  1. Standard library
  2. External crates (axum, sqlx, serde, etc.)
  3. Local modules
```rust
// ✅ Correct import order
use std::env;
use axum::{extract::State, routing::get, Router};
use sqlx::postgres::PgPool;
use serde::{Deserialize, Serialize};
```

#### Code Organization
- Main function at top with setup
- Handler functions grouped by feature
- Struct definitions for state and models
- Error types and helper functions at bottom

#### Naming Conventions
- Functions and variables: snake_case
- Types and structs: PascalCase
- Constants: SCREAMING_SNAKE_CASE
- Database columns: snake_case

#### Error Handling
- Use `Result<T, E>` for fallible functions
- Use `?` operator for error propagation
- Return `StatusCode` from handlers for HTTP errors
- Use `tracing` for logging: `tracing::info!("message");`

#### Database Patterns
- Use SQLx with prepared statements
- Query macros: `sqlx::query!("SQL", params)`
- Connection pooling with `PgPool`
- Async/await throughout

#### Authentication & Authorization
- JWT tokens with `jsonwebtoken` crate
- Middleware for auth validation
- Role-based access control: `root`, `company_admin`, `user`
- Argon2 for password hashing

### ML Service (Python)

#### Code Structure
- FastAPI with Pydantic models
- Type hints required: `def function(param: str) -> bool:`
- Logging with standard library: `logging.getLogger(__name__)`
- Device configuration: GPU/CPU auto-detection

#### ML Patterns
- PyTorch models with `.to(device)` for GPU support
- Trainer classes in separate modules
- Model persistence with `.pt` files
- Async endpoints for long-running operations

#### Error Handling
- HTTPException for API errors
- Proper logging of exceptions
- Graceful fallbacks for GPU unavailability

## 📁 File Organization

### Frontend Structure
```
frontend/src/
├── components/     # Reusable UI components
├── context/        # React Context providers
├── pages/          # Route components
├── locales/        # i18n translation files
├── assets/         # Static assets
├── App.jsx         # Main app component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

### Backend Structure
```
backend/src/
├── main.rs         # Application entry point
└── (all logic in main.rs for now)
```

### ML Service Structure
```
ml_service/
├── trainers/       # ML training modules
├── models/         # Trained model files
├── main.py         # FastAPI application
└── test_gpu.py     # GPU verification script
```

## 🔧 Development Patterns

### API Design
- RESTful endpoints with `/api/` prefix
- JWT Bearer token authentication
- JSON responses with consistent structure
- Proper HTTP status codes

### Database Design
- PostgreSQL with UUID primary keys
- Multitenancy with `client_id` foreign keys
- Enums for constrained values: `user_role_enum`, `user_status`
- Migration files with timestamp prefixes

### State Management
- Frontend: React Context for auth, local state for UI
- Backend: Shared state via database, no in-memory state
- ML: Model persistence, device-aware configuration

### Security Practices
- Password hashing with Argon2
- JWT token expiration validation
- CORS configuration for development
- SQL injection prevention with prepared statements

## 🚀 Common Development Tasks

### Adding New API Endpoint
1. Add route in backend `main.rs`
2. Implement handler function
3. Add authentication middleware if needed
4. Test with proper HTTP methods

### Adding New Frontend Page
1. Create component in `frontend/src/pages/`
2. Add route in `App.jsx`
3. Update navigation in `Layout.jsx`
4. Add translations if needed

### Database Schema Changes
1. Create new migration file: `sqlx migrate add description`
2. Write SQL migration
3. Apply with `cargo sqlx migrate run`
4. Update Rust structs and queries

### ML Model Integration
1. Create trainer in `ml_service/trainers/`
2. Add FastAPI endpoint
3. Handle GPU/CPU device configuration
4. Test with `test_gpu.py`

## ⚠️ Important Notes

- Always run `cargo fmt` and `cargo check` before committing Rust code
- Frontend uses ESLint with React rules
- ML service requires GPU setup for training (CPU fallback available)
- Database migrations must be backward compatible
- JWT secrets must be changed in production
- Use environment variables for all configuration

## 🧪 Testing

- Rust: Use `cargo test` for unit tests
- Frontend: No test framework currently configured
- ML Service: Use `test_gpu.py` for hardware verification
- Integration: Test via API endpoints with proper authentication

This document should be updated as the codebase evolves and new patterns emerge.