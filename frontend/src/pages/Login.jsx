import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import ClientAutocomplete from '../components/ClientAutocomplete';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="center-content">
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Bienvenido</h2>
                {error && <div style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

                {selectedClient && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                        Conectando a: <strong>{selectedClient.name}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Identificar Empresa (Opcional)</label>
                        <ClientAutocomplete
                            isPublic={true}
                            onSelect={setSelectedClient}
                            placeholder="Buscar organización..."
                        />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <Mail size={20} style={{ position: 'absolute', left: '12px', top: '42px', color: '#94a3b8' }} />
                        <label className="form-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="nombre@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <Lock size={20} style={{ position: 'absolute', left: '12px', top: '42px', color: '#94a3b8' }} />
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                    >
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    );
}
