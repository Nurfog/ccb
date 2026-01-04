import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine, ZAxis, Area, Line, ComposedChart } from 'recharts';
import { Sparkles, Eye, X, TrendingUp } from 'lucide-react';

export default function ModelComparison() {
    const { t } = useTranslation();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedModel, setSelectedModel] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/ml/models', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter models that have metrics
                const validModels = (data.models || [])
                    .filter(m => m.metrics && typeof m.metrics.r2_score === 'number')
                    .map(m => ({
                        name: `${m.type} (${m.target})`,
                        id: m.id.substring(0, 8),
                        r2: m.metrics.r2_score,
                        mse: m.metrics.mse || m.metrics.final_loss || 0,
                        r2: m.metrics.r2_score,
                        mse: m.metrics.mse || m.metrics.final_loss || 0,
                        scatterData: m.metrics.scatter_data,
                        fanData: m.metrics.fan_chart_data,
                        fullId: m.id
                    }));
                setModels(validModels);
            }
        } catch (e) {
            console.error('Error fetching models', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
            <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-ghost"
                style={{ marginBottom: '2rem', paddingLeft: 0 }}
            >
                <ArrowLeft size={20} /> {t('common.back')}
            </button>

            <h1 style={{
                fontSize: '2rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                <BarChart2 size={32} style={{ color: '#3b82f6' }} />
                Comparador de Modelos
            </h1>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Cargando métricas...</div>
            ) : models.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No hay modelos entrenados con métricas válidas para comparar.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {models.map((m, idx) => {
                        // Frase predictiva basada en R2
                        let phrase = "Rendimiento Desconocido";
                        let phraseColor = "#94a3b8";
                        let icon = "😐";

                        if (m.r2 > 0.9) {
                            phrase = "Predicciones Altamente Precisas";
                            phraseColor = "#4ade80";
                            icon = "🚀";
                        } else if (m.r2 > 0.75) {
                            phrase = "Modelo Confiable para Tendencias";
                            phraseColor = "#a3e635";
                            icon = "✅";
                        } else if (m.r2 > 0.5) {
                            phrase = "Precisión Moderada (Útil para ref)";
                            phraseColor = "#facc15";
                            icon = "⚠️";
                        } else {
                            phrase = "Baja Confiabilidad (Requiere más datos)";
                            phraseColor = "#f87171";
                            icon = "🛑";
                        }

                        return (
                            <div key={m.fullId} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                                {/* Background Accent */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '100px',
                                    height: '100px',
                                    background: `radial-gradient(circle at top right, ${phraseColor}22, transparent 70%)`
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{m.name}</h3>
                                        <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#94a3b8', marginTop: '0.25rem' }}>
                                            ID: {m.id}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '2rem' }}>{icon}</div>
                                </div>

                                {/* Predictive Phrase */}
                                <div style={{
                                    padding: '0.75rem',
                                    background: `${phraseColor}11`,
                                    borderLeft: `4px solid ${phraseColor}`,
                                    borderRadius: '0 8px 8px 0',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.95rem',
                                    color: phraseColor,
                                    fontWeight: '500'
                                }}>
                                    "{phrase}"
                                </div>

                                {/* Metrics Visual */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div
                                        style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center', cursor: 'help' }}
                                        title="Nivel de Confianza: Porcentaje de veces que el modelo 'acierta' o explica el comportamiento del mercado. Un valor sobre 80% es excelente."
                                    >
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            Confianza (R²) <span style={{ fontSize: '0.8rem' }}>ℹ️</span>
                                        </div>
                                        <div style={{ position: 'relative', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.max(0, Math.min(100, m.r2 * 100))}%`,
                                                height: '100%',
                                                background: phraseColor,
                                                transition: 'width 1s ease-out'
                                            }} />
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                                            {(m.r2 * 100).toFixed(1)}%
                                        </div>
                                    </div>

                                    <div
                                        style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center', cursor: 'help' }}
                                        title="Margen de Error Promedio: Cuánto se 'desvía' el modelo en promedio, medido en las mismas unidades que tus datos (ej: pesos). Mientras más bajo, mejor."
                                    >
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            Margen de Error <span style={{ fontSize: '0.8rem' }}>ℹ️</span>
                                        </div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0' }}>
                                            {m.mse.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>MSE (Desviación)</div>
                                    </div>
                                </div>

                                {/* Mini Chart Placeholder / Action */}
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                        onClick={() => navigate('/ml/predict')}
                                    >
                                        Usar Modelo
                                    </button>
                                    {m.scatterData && (
                                        <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', marginLeft: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedModel(m);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <Eye size={16} style={{ marginRight: '4px' }} /> Ver Gráfico
                                        </button>
                                    )}
                                    {m.fanData && (
                                        <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', marginLeft: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedModel(m);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <TrendingUp size={16} style={{ marginRight: '4px' }} /> Ver Proyección
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Gráfico Actual vs Predicted */}
            {isModalOpen && selectedModel && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '800px', height: '80%', padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginTop: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={24} color="#f59e0b" />
                            Análisis de Regresión: {selectedModel.name}
                        </h2>
                        <p style={{ color: '#94a3b8' }}>Real vs Predicho (Idealmente los puntos deben estar sobre la línea roja)</p>

                        <div style={{ flex: 1, minHeight: 0 }}>
                            {selectedModel.fanData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="step" type="category" tick={{ fill: '#94a3b8' }} />
                                        <YAxis tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div style={{ background: '#1e293b', padding: '0.75rem', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}>
                                                            <strong>Paso: {label}</strong>
                                                            {payload.map((p, i) => (
                                                                <div key={i} style={{ color: p.color, marginTop: '4px' }}>
                                                                    {p.name}: {p.value.toFixed(2)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend />

                                        {/* Áreas de Confianza (Fan) */}
                                        <Area type="monotone" data={selectedModel.fanData.forecast} dataKey="upper_2sigma" stroke="none" fill="#ffd700" fillOpacity={0.1} name="Intervalo 95%" />
                                        <Area type="monotone" data={selectedModel.fanData.forecast} dataKey="lower_2sigma" stroke="none" fill="#1e293b" fillOpacity={1.0} /> {/* Masking Lower */}

                                        <Area type="monotone" data={selectedModel.fanData.forecast} dataKey="upper_1sigma" stroke="none" fill="#f59e0b" fillOpacity={0.2} name="Intervalo 68%" />
                                        <Area type="monotone" data={selectedModel.fanData.forecast} dataKey="lower_1sigma" stroke="none" fill="#1e293b" fillOpacity={1.0} /> {/* Masking Lower */}

                                        {/* Línea de proyección */}
                                        <Line type="monotone" data={selectedModel.fanData.forecast} dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={true} name="Proyección" />

                                        {/* Historia Reciente (Unir visualmente) */}
                                        {/* Nota: Para unir historia y futuro neceistamos manipular los datos para que compartan el eje X correctamente o usar dos graficos superpuestos.
                                            Por simplicidad en este MVP, mostraremos solo la proyección con su fan chart.
                                         */}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" dataKey="actual" name="Valor Real" tick={{ fill: '#94a3b8' }} label={{ value: 'Valor Real', position: 'bottom', fill: '#94a3b8' }} />
                                        <YAxis type="number" dataKey="predicted" name="Predicción" tick={{ fill: '#94a3b8' }} label={{ value: 'Predicción', angle: -90, position: 'left', fill: '#94a3b8' }} />
                                        <ZAxis type="number" range={[50]} />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div style={{ background: '#1e293b', padding: '0.75rem', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}>
                                                            <div>Real: <strong>{data.actual.toFixed(2)}</strong></div>
                                                            <div>Predicho: <strong style={{ color: '#3b82f6' }}>{data.predicted.toFixed(2)}</strong></div>
                                                            <div>Dif: <span style={{ color: Math.abs(data.actual - data.predicted) > 50 ? '#ef4444' : '#10b981' }}>
                                                                {Math.abs(data.actual - data.predicted).toFixed(2)}
                                                            </span></div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        {/* Linea de referencia Y = X (aproximada para visualización) */}
                                        {/* Calculamos min/max visualmente para la linea de referencia */}
                                        {(() => {
                                            const vals = selectedModel.scatterData.map(d => Math.max(d.actual, d.predicted));
                                            const maxVal = Math.max(...vals);
                                            return <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" />;
                                        })()}
                                        <Scatter name="Predicciones" data={selectedModel.scatterData} fill="#3b82f6" shape="circle" fillOpacity={0.6} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
