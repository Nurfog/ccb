import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationsDropdown() {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (token) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // Poll cada 30s
            return () => clearInterval(interval);
        }
    }, [token]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error('Error fetching notifications', e);
        }
    };

    const markAsRead = async (id) => {
        try {
            const res = await fetch(`/api/notifications/read/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            }
        } catch (e) {
            console.error('Error marking as read', e);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} style={{ color: '#10b981' }} />;
            case 'warning': return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
            case 'error': return <XCircle size={16} style={{ color: '#ef4444' }} />;
            default: return <Info size={16} style={{ color: '#3b82f6' }} />;
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 5px',
                        borderRadius: '10px',
                        border: '2px solid #0f172a',
                        minWidth: '18px'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '45px',
                    right: '0',
                    width: '320px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>Notificaciones</span>
                        {unreadCount > 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{unreadCount} nuevas</span>}
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                                No hay notificaciones
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => markAsRead(notif.id)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #334155',
                                        background: notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}
                                >
                                    {!notif.is_read && <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: '#3b82f6' }} />}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ marginTop: '2px' }}>{getIcon(notif.notif_type)}</div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: notif.is_read ? '#cbd5e1' : '#fff' }}>{notif.title}</div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>{notif.message}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={10} /> {new Date(notif.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
