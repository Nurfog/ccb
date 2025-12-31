import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Search, Calendar, User, Activity } from 'lucide-react';

export default function AuditLogs() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error('Error fetching logs', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-ghost"
                style={{ marginBottom: '2rem', paddingLeft: 0 }}
            >
                <ArrowLeft size={20} /> Volver al Dashboard
            </button>

            <h1 style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                <Shield size={32} style={{ color: '#3b82f6' }} />
                Logs de Auditoría
            </h1>
            <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>
                Registro detallado de acciones administrativas y de sistema
            </p>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por usuario o acción..."
                        style={{
                            width: '100%',
                            padding: '10px 10px 10px 40px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>Fecha</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>Usuario</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>Acción</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>Objetivo</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}><span className="spinner"></span></td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No se encontraron logs</td></tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                                                <Calendar size={14} style={{ color: '#64748b' }} />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                                                <User size={14} style={{ color: '#64748b' }} />
                                                {log.user_email || 'Sistema'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                color: '#60a5fa',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'uppercase'
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {log.target_type && (
                                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                                    {log.target_type} {log.target_id && <span style={{ opacity: 0.5 }}>({log.target_id.substring(0, 8)})</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {JSON.stringify(log.details)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .spinner {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    border-top-color: #3b82f6;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
