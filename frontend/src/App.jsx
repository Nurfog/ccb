import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateUser from './pages/CreateUser';
import UploadData from './pages/UploadData';
import CreateClient from './pages/CreateClient';
import CompanyUsers from './pages/CompanyUsers';
import TrainModel from './pages/TrainModel';

// Componente para proteger rutas
const PrivateRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'grid', placeItems: 'center' }}>Cargando...</div>;

  if (!user) return <Navigate to="/login" />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/create-user"
        element={
          <PrivateRoute roles={['root']}>
            <CreateUser />
          </PrivateRoute>
        }
      />

      <Route
        path="/create-client"
        element={
          <PrivateRoute roles={['root']}>
            <CreateClient />
          </PrivateRoute>
        }
      />

      <Route
        path="/company/users"
        element={
          <PrivateRoute roles={['root', 'company_admin']}>
            <CompanyUsers />
          </PrivateRoute>
        }
      />

      <Route
        path="/upload-data"
        element={
          <PrivateRoute roles={['root', 'company_admin', 'user']}>
            <UploadData />
          </PrivateRoute>
        }
      />

      <Route
        path="/train-model"
        element={
          <PrivateRoute>
            <TrainModel />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
