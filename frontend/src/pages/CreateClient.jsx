import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building, User, Calendar, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function CreateClient() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        client_type: 'company', // 'company' or 'natural_person'
        contract_duration_days: ''
    });

    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [msg, setMsg] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMsg('');

        const payload = {
            name: formData.name,
            client_type: formData.client_type,
            contract_duration_days: formData.client_type === 'natural_person' ? parseInt(formData.contract_duration_days) : null
        };

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al crear cliente');

            setStatus('success');
            setMsg(`Cliente "${data.name}" creado. Redirigiendo a crear administrador...`);

            setTimeout(() => {
                navigate('/create-user', {
                    state: { preselectedClient: { id: data.id, name: data.name } }
                });
            }, 1500);

        } catch (err) {
            setStatus('error');
            setMsg(err.message);
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

                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Registrar Cliente</h2>
                <p style={{ marginBottom: '2rem' }}>
                    Da de alta una nueva Empresa o Persona Natural en el sistema.
                </p>

                {status === 'success' && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#4ade80', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle size={20} /> {msg}
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} /> {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Nombre / Razón Social</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                name="name"
                                required
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ej: Tech Solutions SpA"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tipo de Cliente</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                            <label style={{
                                padding: '1rem',
                                background: formData.client_type === 'company' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                border: formData.client_type === 'company' ? '1px solid #3b82f6' : '1px solid #334155',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="radio"
                                    name="client_type"
                                    value="company"
                                    checked={formData.client_type === 'company'}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <Building size={24} color={formData.client_type === 'company' ? '#fff' : '#94a3b8'} />
                                <span style={{ color: formData.client_type === 'company' ? '#fff' : '#94a3b8', fontSize: '0.9rem' }}>Empresa</span>
                            </label>

                            <label style={{
                                padding: '1rem',
                                background: formData.client_type === 'natural_person' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                border: formData.client_type === 'natural_person' ? '1px solid #3b82f6' : '1px solid #334155',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="radio"
                                    name="client_type"
                                    value="natural_person"
                                    checked={formData.client_type === 'natural_person'}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <User size={24} color={formData.client_type === 'natural_person' ? '#fff' : '#94a3b8'} />
                                <span style={{ color: formData.client_type === 'natural_person' ? '#fff' : '#94a3b8', fontSize: '0.9rem' }}>Persona</span>
                            </label>
                        </div>
                    </div>

                    {formData.client_type === 'natural_person' && (
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="form-label">Duración del Contrato (Días)</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="number"
                                    name="contract_duration_days"
                                    required
                                    min="1"
                                    className="form-input"
                                    value={formData.contract_duration_days}
                                    onChange={handleChange}
                                    placeholder="Ej: 365"
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={status === 'loading'}
                        style={{ marginTop: '1rem', width: '100%' }}
                    >
                        {status === 'loading' ? 'Registrando...' : 'Crear Cliente'}
                    </button>
                </form>
            </div>
        </div>
    );
}
