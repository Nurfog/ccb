import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, CheckCircle, XCircle, ArrowLeft, Shield, Edit } from 'lucide-react';

export default function CompanyUsers() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'user', // 'user' or 'company_admin'
        status: 'active',
        access_level: 'read_write'
    });
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/company/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error("Error fetching users", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');

        try {
            const payload = {
                ...formData,
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

            setMsg(`Usuario ${data.email} creado.`);
            setFormData({ email: '', password: '', role: 'user', status: 'active', access_level: 'read_write' });
            setShowForm(false);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        background: '#1e293b',
        borderRadius: '12px',
        overflow: 'hidden'
    };

    const thStyle = {
        textAlign: 'left',
        padding: '1rem',
        background: '#334155',
        color: '#fff',
        textTransform: 'uppercase',
        fontSize: '0.85rem'
    };

    const tdStyle = {
        padding: '1rem',
        borderBottom: '1px solid #334155'
    };

    const badgeStyle = (type, value) => {
        let bg = '#475569';
        let color = '#fff';

        if (type === 'status') {
            bg = value === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            color = value === 'active' ? '#4ade80' : '#fca5a5';
        } else if (type === 'access') {
            bg = value === 'read_write' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)';
            color = value === 'read_write' ? '#60a5fa' : '#fde047';
        }

        return {
            background: bg,
            color: color,
            padding: '4px 8px',
            borderRadius: '99px',
            fontSize: '0.75rem',
            display: 'inline-block'
        };
    };

    return (
        <div className="container">
            <div className="app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem' }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Gestión de Equipo</h1>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    {showForm ? <XCircle size={20} /> : <UserPlus size={20} />}
                    {showForm ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </div>

            {msg && <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{msg}</div>}
            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Registrar Nuevo Miembro</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email" required
                                className="form-input"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <input
                                type="password" required
                                className="form-input"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Rol</label>
                            <select
                                className="form-select"
                                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="user">Usuario Estándar</option>
                                <option value="company_admin">Admin de Empresa</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select
                                className="form-select"
                                value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Activo</option>
                                <option value="disabled">Deshabilitado</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nivel de Acceso</label>
                            <select
                                className="form-select"
                                value={formData.access_level} onChange={e => setFormData({ ...formData, access_level: e.target.value })}
                            >
                                <option value="read_write">Escritura (Completo)</option>
                                <option value="read_only">Solo Lectura</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Crear Usuario
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? <p>Cargando equipo...</p> : (
                users.length === 0 ? <p>No hay usuarios registrados aún.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Rol</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={thStyle}>Acceso</th>
                                    <th style={thStyle}>Fecha Creación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td style={tdStyle}>{u.email} {user.id === u.id && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>(Tú)</span>}</td>
                                        <td style={tdStyle}>{u.role}</td>
                                        <td style={tdStyle}><span style={badgeStyle('status', u.status)}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                                        <td style={tdStyle}><span style={badgeStyle('access', u.access_level)}>{u.access_level === 'read_write' ? 'Escritura' : 'Lectura'}</span></td>
                                        <td style={tdStyle}>{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
