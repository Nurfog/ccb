import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, TrendingUp, Users, Building, Database, BarChart3, Activity, Clock, FileText, Shield, Download, FileSpreadsheet, Building2, Settings, Upload, Plus, Brain, BarChart2, Network } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import NotificationsDropdown from '../components/NotificationsDropdown';

export default function Dashboard() {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [charts, setCharts] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, analyticsRes, chartsRes] = await Promise.all([
                fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/stats/charts', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
            if (chartsRes.ok) setCharts(await chartsRes.json());
        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="card" style={{
            background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
            borderLeft: `4px solid ${color}`,
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                <Icon size={120} color={color} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
                <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: 'bold', color: color }}>{loading ? '...' : value}</h2>
                {subtitle && <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>{subtitle}</p>}
            </div>
        </div>
    );

    const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => (
        <div className="card" style={{
            padding: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.3s',
            borderLeft: `3px solid ${color}`,
        }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderLeftWidth = '5px';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderLeftWidth = '3px';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                    background: `${color}22`,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} color={color} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>{description}</p>
        </div>
    );

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1400px' }}>
            <header className="app-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Dashboard Analytics
                    </h1>
                    <div style={{ marginTop: '0.5rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Bienvenido,</span>
                        <strong style={{ color: '#fff' }}>{user?.email}</strong>
                        <span style={{
                            background: user?.role === 'root' ? '#dc2626' : user?.role === 'company_admin' ? '#ca8a04' : '#2563eb',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            marginLeft: '0.5rem'
                        }}>
                            {user?.role?.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <NotificationsDropdown />
                    <button onClick={handleLogout} className="btn btn-ghost">
                        <LogOut size={18} /> Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {user?.role === 'root' && (
                    <MetricCard
                        title="Total Empresas"
                        value={stats?.total_clients || 0}
                        icon={Building}
                        color="#10b981"
                        subtitle="Clientes registrados"
                    />
                )}
                <MetricCard
                    title={user?.role === 'root' ? "Total Usuarios" : "Miembros del Equipo"}
                    value={stats?.total_users || 0}
                    icon={Users}
                    color="#3b82f6"
                    subtitle={user?.role === 'user' ? 'Tu cuenta' : 'En el sistema'}
                />
                <MetricCard
                    title="Usuarios Activos"
                    value={stats?.active_users || 0}
                    icon={Activity}
                    color="#f59e0b"
                    subtitle="Con acceso habilitado"
                />
                <MetricCard
                    title="Datasets Cargados"
                    value={stats?.total_datasets || 0}
                    icon={Database}
                    color="#8b5cf6"
                    subtitle="Archivos procesados"
                />
            </div>

            {/* Charts Section */}
            <DashboardCharts data={charts} role={user?.role} />

            {/* Analytics Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Recent Uploads */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', marginBottom: '1.5rem' }}>
                        <FileText size={24} />
                        Últimos Uploads
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            Cargando...
                        </div>
                    ) : analytics?.recent_uploads?.length > 0 ? (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {analytics.recent_uploads.map((upload, idx) => (
                                <div key={idx} style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderLeft: '3px solid #3b82f6',
                                    borderRadius: '6px',
                                    marginBottom: '0.75rem',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{upload.schema_name}</strong>
                                        <span style={{
                                            background: '#3b82f622',
                                            color: '#60a5fa',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {upload.row_count?.toLocaleString() || 0} filas
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                        <Clock size={14} />
                                        {formatDate(upload.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            <Database size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ margin: 0 }}>No hay datos cargados aún</p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Sube tu primer archivo para comenzar</p>
                        </div>
                    )}
                </div>

                <div onClick={() => navigate('/ml/predict')} className="dashboard-card action-card" style={{ cursor: 'pointer', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ejecutar Predicciones</h3>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Ejecutar modelos </p>
                        </div>
                    </div>
                </div>

                <div onClick={() => navigate('/models/compare')} className="dashboard-card action-card" style={{ cursor: 'pointer', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Comparar Modelos</h3>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Ver gráficas de precisión</p>
                        </div>
                    </div>
                </div>

                <div onClick={() => navigate('/executive-clusters')} className="dashboard-card action-card" style={{ cursor: 'pointer', borderLeft: '4px solid #06b6d4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                            <Network size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Agrupamiento Visual</h3>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Segmentación automática 2D</p>
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                        <BarChart3 size={24} />
                        Resumen de Datos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                        <div style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #8b5cf622 0%, #8b5cf611 100%)',
                            borderRadius: '12px',
                            borderLeft: '4px solid #8b5cf6',
                            textAlign: 'center'
                        }}>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Filas Procesadas</p>
                            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '3rem', fontWeight: 'bold', color: '#a78bfa' }}>
                                {analytics?.total_rows?.toLocaleString() || 0}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>Estado del Sistema</span>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>● Operativo</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>Base de Datos</span>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>● Conectada</span>
                        </div>

                        {analytics?.recent_uploads && analytics.recent_uploads.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: '#94a3b8' }}>Último Upload</span>
                                <span style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    {formatDate(analytics.recent_uploads[0]?.created_at)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>Acciones Rápidas</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {user?.role === 'root' && (
                    <>
                        <QuickActionCard
                            title="Registrar Empresa"
                            description="Da de alta una nueva empresa en el sistema"
                            icon={Building}
                            color="#10b981"
                            onClick={() => navigate('/create-client')}
                        />
                        <QuickActionCard
                            title="Crear Usuario"
                            description="Añade un nuevo administrador o usuario"
                            icon={Users}
                            color="#3b82f6"
                            onClick={() => navigate('/create-user')}
                        />
                    </>
                )}
                {(user?.role === 'company_admin' || user?.role === 'root') && (
                    <QuickActionCard
                        title="Gestionar Equipo"
                        description="Administra usuarios y permisos de tu empresa"
                        icon={Users}
                        color="#8b5cf6"
                        onClick={() => navigate('/company/users')}
                    />
                )}
                <QuickActionCard
                    title="Entrenar Modelo ML"
                    description="Entrena modelos de Machine Learning con GPU"
                    icon={TrendingUp}
                    color="#06b6d4"
                    onClick={() => navigate('/train-model')}
                />
                <QuickActionCard
                    title="Realizar Predicciones"
                    description="Usa modelos entrenados para predecir resultados"
                    icon={Activity}
                    color="#ec4899"
                    onClick={() => navigate('/predictions')}
                />
                <QuickActionCard
                    title="Cargar Datos"
                    description="Sube archivos CSV o Excel para entrenamiento"
                    icon={Database}
                    color="#f59e0b"
                    onClick={() => navigate('/upload-data')}
                />
                {user.role === 'root' && (
                    <QuickActionCard
                        title="Logs de Auditoría"
                        description="Ver historial de seguridad y acciones"
                        icon={Shield}
                        color="#ef4444"
                        onClick={() => navigate('/admin/logs')}
                    />
                )}
            </div>

            <div style={{ marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Exportar Datos</h2>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => window.open(window.location.protocol + '//' + window.location.hostname + ':3004/api/stats/export/excel', '_blank')}
                    >
                        <FileSpreadsheet size={18} /> Exportar Excel
                    </button>
                    <button
                        className="btn btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #334155' }}
                        onClick={() => window.open(window.location.protocol + '//' + window.location.hostname + ':3004/api/stats/export/pdf', '_blank')}
                    >
                        <Download size={18} /> Exportar PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
