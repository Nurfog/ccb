import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ClientAutocomplete from '../components/ClientAutocomplete';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem' }}>{t('common.welcome')}</h2>
                    <LanguageSwitcher />
                </div>
                {error && <div style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

                {selectedClient && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                        {t('login.connecting_to')}: <strong>{selectedClient.name}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('login.identify_company')}</label>
                        <ClientAutocomplete
                            isPublic={true}
                            onSelect={setSelectedClient}
                            placeholder={t('login.search_placeholder')}
                        />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <Mail size={20} style={{ position: 'absolute', left: '12px', top: '42px', color: '#94a3b8' }} />
                        <label className="form-label">{t('common.email')}</label>
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
                        <label className="form-label">{t('common.password')}</label>
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
                        {t('login.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
