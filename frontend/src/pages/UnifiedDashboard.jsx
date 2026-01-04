import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Network, TrendingUp, BarChart2, Users, RefreshCw, Zap } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, Line, ComposedChart, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function UnifiedDashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();

    // State
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [models, setModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Clustering State
    const [nClusters, setNClusters] = useState(3);
    const [clusterResult, setClusterResult] = useState(null);
    const [loadingCluster, setLoadingCluster] = useState(false);
    const [trainingAll, setTrainingAll] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchDatasets();
        fetchModels();
    }, []);

    const fetchDatasets = async () => {
        try {
            const res = await fetch('/api/analytics', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setDatasets(data.recent_uploads || []);
                // Auto-select first if available
                if (data.recent_uploads && data.recent_uploads.length > 0) {
                    setSelectedDataset(data.recent_uploads[0]);
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const res = await fetch('/api/ml/models', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setModels(data.models || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingModels(false); }
    };

    // Auto-run clustering when dataset changes (optional, maybe wait for button?)
    // Let's wait for explicit trigger or separate effect if we want auto-load.
    // Ideally user selects dataset -> big dashboard updates.
    useEffect(() => {
        if (selectedDataset) {
            runClustering();
        }
    }, [selectedDataset, nClusters]);

    const runClustering = async () => {
        if (!selectedDataset) return;
        setLoadingCluster(true);
        try {
            const res = await fetch('/api/ml/train/clustering', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ schema_id: selectedDataset.schema_id, n_clusters: nClusters })
            });
            if (res.ok) setClusterResult(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoadingCluster(false); }
    };

    const handleTrainAll = async () => {
        setTrainingAll(true);
        try {
            const res = await fetch('/api/ml/train-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    client_id: selectedDataset?.schema_id,
                    force: false
                })
            });

            if (!res.ok) {
                const error = await res.json();
                alert('❌ Error: ' + (error.error || 'Error desconocido'));
                return;
            }

            const result = await res.json();
            alert(`✅ Entrenados: ${result.trained.length}\n⏭️ Omitidos: ${result.skipped.length}\n❌ Errores: ${result.errors.length}\n\nDetalles:\n${result.trained.join('\n')}`);
            fetchModels(); // Refresh model list
        } catch (e) {
            alert('Error al entrenar modelos: ' + e.message);
        } finally {
            setTrainingAll(false);
        }
    };

    // Filtered Views
    const relevantModels = models.filter(m => selectedDataset && m.schema_id === selectedDataset.schema_id);
    const bestModel = relevantModels.sort((a, b) => (b.metrics?.r2_score || 0) - (a.metrics?.r2_score || 0))[0];

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1600px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BarChart2 style={{ color: '#3b82f6' }} /> Tablero Unificado
                </h1>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        className="form-select"
                        style={{ minWidth: '250px' }}
                        value={selectedDataset?.schema_id || ''}
                        onChange={(e) => setSelectedDataset(datasets.find(d => d.schema_id === e.target.value))}
                    >
                        <option value="">Selecciona Empresa/Cliente...</option>
                        {datasets.map(d => (
                            <option key={d.schema_id} value={d.schema_id}>{d.schema_name}</option>
                        ))}
                    </select>

                    <button
                        className="btn btn-primary"
                        style={{ background: '#f59e0b', borderColor: '#f59e0b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        onClick={handleTrainAll}
                        disabled={trainingAll}
                    >
                        <Zap size={18} /> {trainingAll ? 'Entrenando...' : 'Re-entrenar Todo'}
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            {selectedDataset ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '1.5rem' }}>

                    {/* Card 1: Segmentation (Clustering) */}
                    <div className="card" style={{ padding: '1.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#fff' }}>
                                <Network size={20} color="#06b6d4" /> Segmentación de Clientes
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Grupos: {nClusters}
                                <input
                                    type="range" min="2" max="6" value={nClusters}
                                    onChange={(e) => setNClusters(parseInt(e.target.value))}
                                    style={{ width: '80px' }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                            {loadingCluster ? (
                                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>Analizando patrones...</div>
                            ) : clusterResult ? (
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
                                                    const clusterName = clusterResult.clusters[data.cluster]?.name || `G${data.cluster + 1}`;
                                                    return (
                                                        <div style={{ background: '#1e293b', padding: '0.5rem', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}>
                                                            <strong style={{ color: COLORS[data.cluster % COLORS.length] }}>{clusterName}</strong>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Clusters" data={clusterResult.points} fill="#8884d8">
                                            {clusterResult.points.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}>No hay datos de segmentación</div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Sales Forecast (Best Model) */}
                    <div className="card" style={{ padding: '1.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#fff' }}>
                                <TrendingUp size={20} color="#f59e0b" /> Proyección de Ventas (Fan Chart)
                            </h3>
                            {bestModel && <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>Modelo: {bestModel.type} (R² {(bestModel.metrics?.r2_score * 100).toFixed(0)}%)</span>}
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                            {loadingModels ? (
                                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>Cargando modelos...</div>
                            ) : bestModel && bestModel.metrics?.fan_chart_data ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="step" type="category" tick={{ fill: '#94a3b8' }} />
                                        <YAxis tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
                                        <Tooltip labelStyle={{ color: '#000' }} />
                                        <Legend />
                                        <Area type="monotone" data={bestModel.metrics.fan_chart_data.forecast} dataKey="upper_2sigma" stroke="none" fill="#ffd700" fillOpacity={0.1} name="95%" />
                                        <Area type="monotone" data={bestModel.metrics.fan_chart_data.forecast} dataKey="lower_2sigma" stroke="none" fill="#1e293b" fillOpacity={1.0} />
                                        <Area type="monotone" data={bestModel.metrics.fan_chart_data.forecast} dataKey="upper_1sigma" stroke="none" fill="#f59e0b" fillOpacity={0.2} name="68%" />
                                        <Area type="monotone" data={bestModel.metrics.fan_chart_data.forecast} dataKey="lower_1sigma" stroke="none" fill="#1e293b" fillOpacity={1.0} />
                                        <Line type="monotone" data={bestModel.metrics.fan_chart_data.forecast} dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={true} name="Proyección" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}>
                                    {bestModel ? "Este modelo no tiene proyección temporal." : "No hay modelos entrenados para este cliente."}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 3: Model Health / KPIs */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Estado del Sistema IA</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            <div style={{ background: '#334155', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Modelos Activos</div>
                                <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{relevantModels.length}</div>
                            </div>
                            <div style={{ background: '#334155', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Mejor Precisión</div>
                                <div style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {bestModel ? `${(bestModel.metrics?.r2_score * 100).toFixed(1)}%` : '-'}
                                </div>
                            </div>
                            {/* Add more KPIs */}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: '#64748b' }}>
                    <div>
                        <Users size={64} style={{ opacity: 0.2, margin: '0 auto 1rem auto', display: 'block' }} />
                        <h2>Selecciona una Empresa para comenzar</h2>
                        <p>Elige un cliente arriba para ver su tablero de inteligencia.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
