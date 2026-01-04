import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    BrainCircuit,
    Database,
    Users,
    Building2,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Activity,
    UserPlus
} from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        {
            label: 'Inicio',
            path: '/dashboard', // Re-routed former dashboard to be "Home/Summary"
            icon: <Activity size={20} />,
            roles: ['root', 'company_admin', 'user']
        },
        {
            label: 'Tablero Unificado',
            path: '/unified-dashboard',
            icon: <LayoutDashboard size={20} />,
            roles: ['root', 'company_admin', 'user']
        },
        {
            label: 'Entrenamiento ML',
            path: '/train-model',
            icon: <BrainCircuit size={20} />,
            roles: ['root', 'company_admin', 'user']
        },
        {
            label: 'Cargar Datos',
            path: '/upload-data',
            icon: <Database size={20} />,
            roles: ['root', 'company_admin', 'user']
        },
        {
            label: 'Gestión Usuarios',
            path: '/company/users',
            icon: <Users size={20} />,
            roles: ['root', 'company_admin']
        },
        {
            label: 'Crear Cliente',
            path: '/create-client',
            icon: <Building2 size={20} />,
            roles: ['root']
        },
        {
            label: 'Crear Usuario',
            path: '/create-user',
            icon: <UserPlus size={20} />,
            roles: ['root']
        }
    ];

    // Filter items by role
    const filteredMenu = menuItems.filter(item =>
        item.roles.includes(user?.role)
    );

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f172a', overflow: 'hidden' }}>

            {/* Sidebar */}
            <aside
                style={{
                    width: isSidebarOpen ? '260px' : '80px',
                    background: '#1e293b',
                    borderRight: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s ease',
                    position: 'relative',
                    zIndex: 20
                }}
            >
                {/* Logo Area */}
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #334155' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        borderRadius: '8px', flexShrink: 0
                    }} />
                    {isSidebarOpen && (
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            CCB Analytics
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredMenu.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <button
                                        onClick={() => navigate(item.path)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.75rem 1rem',
                                            background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: isActive ? '#60a5fa' : '#94a3b8',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            justifyContent: isSidebarOpen ? 'flex-start' : 'center'
                                        }}
                                        title={!isSidebarOpen ? item.label : ''}
                                    >
                                        {item.icon}
                                        {isSidebarOpen && <span style={{ fontSize: '0.95rem' }}>{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Profile / Logout */}
                <div style={{ padding: '1rem', borderTop: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingLeft: isSidebarOpen ? '0' : '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#475569', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </div>
                        {isSidebarOpen && (
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>{user?.username}</div>
                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{user?.role}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            justifyContent: isSidebarOpen ? 'center' : 'center'
                        }}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Cerrar Sesión</span>}
                    </button>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: '-12px',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 30
                    }}
                >
                    <ChevronRight size={14} style={{ transform: isSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </button>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* Header Mobile / Title */}
                <header style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)',
                    padding: '1rem 2rem', borderBottom: '1px solid #1e293b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        {/* Breadcrumbs or Page Title could go here */}
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Panel de Control</h2>
                    </div>
                    {/* Header Actions */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Notifications, Settings etc. */}
                    </div>
                </header>

                <div style={{ padding: '0' }}> {/* Removing extra padding here as pages assume container */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
