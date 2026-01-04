import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowLeft, Users, Target, Layers } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ExecutiveClusters() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [nClusters, setNClusters] = useState(3);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const res = await fetch('/api/analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDatasets(data.recent_uploads || []);
            }
        } catch (e) {
            console.error('Error fetching datasets', e);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedDataset) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/ml/train/clustering', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    schema_id: selectedDataset.schema_id,
                    n_clusters: nClusters
                })
            });

            if (!res.ok) {
                throw new Error('Error al generar los grupos');
            }

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1400px' }}>
            {/* Header Ejecutivo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-ghost"
                        style={{ marginBottom: '1rem', paddingLeft: 0, color: '#94a3b8' }}
                    >
                        <ArrowLeft size={18} /> Volver al Inicio
                    </button>
                    <h1 style={{
                        fontSize: '2rem',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: '#fff'
                    }}>
                        <Network size={32} style={{ color: '#06b6d4' }} />
                        Tablero de Segmentación Visual
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                        Descubre grupos ocultos en tus datos sin ver números complejos.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Panel de Control */}
                <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={20} />
                        Configuración
                    </h3>

                    <div className="form-group">
                        <label className="form-label">1. Elige qué analizar</label>
                        <select
                            className="form-select"
                            value={selectedDataset?.schema_id || ''}
                            onChange={(e) => setSelectedDataset(datasets.find(d => d.schema_id === e.target.value))}
                        >
                            <option value="">Selecciona un Dataset...</option>
                            {datasets.map(ds => (
                                <option key={ds.schema_id} value={ds.schema_id}>{ds.schema_name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedDataset && (
                        <div className="form-group" style={{ marginTop: '2rem' }}>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>2. ¿Cuántos grupos buscar?</span>
                                <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{nClusters}</span>
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="6"
                                step="1"
                                value={nClusters}
                                onChange={(e) => setNClusters(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                                <span>General</span>
                                <span>Detallado</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedDataset || loading}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        {loading ? 'Analizando...' : 'Generar Mapa Visual'}
                    </button>

                    {error && (
                        <div style={{ padding: '1rem', background: '#f8717122', color: '#f87171', borderRadius: '8px', marginTop: '1rem' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Área Visual */}
                <div style={{ minHeight: '600px' }}>
                    {!result ? (
                        <div className="card" style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#64748b',
                            border: '2px dashed #334155'
                        }}>
                            <Layers size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>Selecciona datos y genera el mapa para ver los resultados.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: '1.5rem', height: '100%' }}>
                            {/* Gráfico Principal */}
                            <div className="card" style={{ padding: '1rem', position: 'relative', width: '100%', minWidth: 0, height: '540px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" dataKey="x" name="C1" hide />
                                        <YAxis type="number" dataKey="y" name="C2" hide />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const clusterName = result.clusters[data.cluster]?.name || `Grupo ${data.cluster + 1}`;
                                                    return (
                                                        <div style={{ background: '#1e293b', padding: '0.75rem', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}>
                                                            <strong style={{ color: COLORS[data.cluster % COLORS.length] }}>{clusterName}</strong>
                                                            <div style={{ marginTop: '0.25rem' }}>{data.label}</div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Clusters" data={result.points} fill="#8884d8">
                                            {result.points.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: '#00000088', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem', color: '#fff' }}>
                                    Mapa de Similitud 2D
                                </div>
                            </div>

                            {/* Resumen de Grupos */}
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${result.clusters.length}, 1fr)`, gap: '1rem' }}>
                                {result.clusters.map((cluster, idx) => (
                                    <div key={idx} className="card" style={{ padding: '1rem', borderTop: `4px solid ${COLORS[idx % COLORS.length]}` }}>
                                        <div style={{ color: COLORS[idx % COLORS.length], fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={16} /> {cluster.name || `Grupo ${idx + 1}`}
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                                            {cluster.count.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Elementos</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
