import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function DashboardCharts({ data, role }) {
    if (!data) return null;

    const { user_growth, dataset_growth } = data;

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    padding: '10px',
                    borderRadius: '8px'
                }}>
                    <p style={{ color: '#cbd5e1', margin: 0, fontWeight: 'bold' }}>{label}</p>
                    <p style={{ color: payload[0].color, margin: 0 }}>
                        {payload[0].name}: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* User Growth Chart */}
            <div className="card" style={{ padding: '1.5rem', minHeight: '350px' }}>
                <h3 style={{ marginTop: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                    Crecimiento de Usuarios
                </h3>
                <div style={{ height: '300px', width: '100%' }}>
                    {user_growth && user_growth.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={user_growth}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="value" name="Usuarios" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                            No hay datos suficientes
                        </div>
                    )}
                </div>
            </div>

            {/* Dataset Growth Chart */}
            <div className="card" style={{ padding: '1.5rem', minHeight: '350px' }}>
                <h3 style={{ marginTop: 0, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                    Datasets Subidos
                </h3>
                <div style={{ height: '300px', width: '100%' }}>
                    {dataset_growth && dataset_growth.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataset_growth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                                <Bar dataKey="value" name="Datasets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                            No hay datos suficientes
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
