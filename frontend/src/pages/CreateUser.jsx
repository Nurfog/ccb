import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import ClientAutocomplete from '../components/ClientAutocomplete';

export default function CreateUser() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'user',
        client_id: null
    });
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [selectedClient, setSelectedClient] = useState(null);

    useEffect(() => {
        if (location.state?.preselectedClient) {
            setSelectedClient(location.state.preselectedClient);
            setFormData(prev => ({ ...prev, role: 'company_admin' }));
        }
    }, [location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', msg: 'Creando usuario...' });

        try {
            const payload = {
                ...formData,
                client_id: selectedClient ? selectedClient.id : null
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error creando usuario');

            setStatus({ type: 'success', msg: `Usuario ${data.email} creado exitosamente` });
            if (!location.state?.preselectedClient) {
                setFormData({ email: '', password: '', role: 'user', client_id: null });
                setSelectedClient(null);
            }
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
    };

    return (
        <div className="center-content">
            <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-ghost"
                    style={{ marginBottom: '2rem', paddingLeft: 0, justifyContent: 'flex-start' }}
                >
                    <ArrowLeft size={20} /> Volver al Dashboard
                </button>

                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                    <UserPlus size={28} color="#3b82f6" /> Crear Nuevo Usuario
                </h2>

                {status.msg && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        borderRadius: '8px',
                        background: status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: status.type === 'error' ? '#fca5a5' : '#86efac',
                        border: `1px solid ${status.type === 'error' ? '#ef4444' : '#22c55e'}`
                    }}>
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            required
                            className="form-input"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="form-input"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rol</label>
                        <select
                            className="form-select"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="user">Usuario Estándar</option>
                            <option value="company_admin">Admin de Empresa</option>
                            <option value="root">Super Admin (Root)</option>
                        </select>
                    </div>

                    {formData.role !== 'root' && (
                        <div className="form-group">
                            <label className="form-label">Asignar Empresa</label>
                            {/* Si ya hay un cliente preseleccionado por navegación, lo mostramos fijo o editable pero con valor inicial */}
                            {location.state?.preselectedClient ? (
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span><strong>Empresa:</strong> {selectedClient?.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClient(null);
                                            navigate(location.pathname, { state: {} }); // Limpiar estado
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <ClientAutocomplete
                                        onSelect={setSelectedClient}
                                        placeholder="Buscar empresa..."
                                    />
                                    {selectedClient && <div style={{ fontSize: '0.9rem', color: '#4ade80', marginTop: '-0.5rem' }}>Seleccionada: {selectedClient.name}</div>}
                                </>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={status.type === 'loading'}
                        style={{ width: '100%', marginTop: '1rem' }}
                    >
                        {status.type === 'loading' ? 'Procesando...' : 'Crear Usuario'}
                    </button>
                </form>
            </div>
        </div>
    );
}
