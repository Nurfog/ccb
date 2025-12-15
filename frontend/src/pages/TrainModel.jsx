import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, Zap, TrendingUp, Settings, Database } from 'lucide-react';

export default function TrainModel() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [targetColumn, setTargetColumn] = useState('');
    const [hyperparams, setHyperparams] = useState({
        epochs: 100,
        learning_rate: 0.001,
        batch_size: 32
    });
    const [training, setTraining] = useState(false);
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

    const handleTrain = async () => {
        if (!selectedDataset) {
            setError('Selecciona un dataset primero');
            return;
        }
        if (!targetColumn) {
            setError('Especifica la columna objetivo');
            return;
        }

        setTraining(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/ml/train', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    schema_id: selectedDataset.schema_id,
                    target_column: targetColumn,
                    ...hyperparams
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Error en entrenamiento');
            }

            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setTraining(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '900px' }}>
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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                <Brain size={32} style={{ color: '#8b5cf6' }} />
                Entrenar Modelo ML
            </h1>
            <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>
                Entrena un modelo de regresión con tus datos usando GPU acelerado
            </p>

            {/* Selección de Dataset */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={20} />
                    1. Seleccionar Dataset
                </h3>

                {datasets.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No hay datasets disponibles. Sube datos primero.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {datasets.map((ds, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedDataset(ds)}
                                style={{
                                    padding: '1rem',
                                    background: selectedDataset?.schema_id === ds.schema_id ? '#8b5cf622' : 'rgba(255,255,255,0.03)',
                                    border: selectedDataset?.schema_id === ds.schema_id ? '2px solid #8b5cf6' : '1px solid #334155',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                                onMouseLeave={(e) => {
                                    if (selectedDataset?.schema_id !== ds.schema_id) {
                                        e.currentTarget.style.borderColor = '#334155';
                                    }
                                }}
                            >
                                <strong style={{ color: '#fff' }}>{ds.schema_name}</strong>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                    {ds.row_count?.toLocaleString() || 0} filas
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Configuración */}
            {selectedDataset && (
                <>
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Settings size={20} />
                            2. Configuración
                        </h3>

                        <div className="form-group">
                            <label className="form-label">Columna Objetivo (Target)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: precio, ventas, ingreso"
                                value={targetColumn}
                                onChange={(e) => setTargetColumn(e.target.value)}
                            />
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                                La columna que quieres predecir
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Epochs: {hyperparams.epochs}</label>
                            <input
                                type="range"
                                min="10"
                                max="500"
                                step="10"
                                value={hyperparams.epochs}
                                onChange={(e) => setHyperparams({ ...hyperparams, epochs: parseInt(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Más epochs = mejor aprendizaje (pero más lento)
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Batch Size: {hyperparams.batch_size}</label>
                            <input
                                type="range"
                                min="8"
                                max="128"
                                step="8"
                                value={hyperparams.batch_size}
                                onChange={(e) => setHyperparams({ ...hyperparams, batch_size: parseInt(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Más grande = más rápido (usa más GPU)
                            </p>
                        </div>
                    </div>

                    {/* Botón de Entrenar */}
                    <button
                        onClick={handleTrain}
                        disabled={training}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem'
                        }}
                    >
                        {training ? (
                            <>
                                <span className="spinner"></span>
                                Entrenando...
                            </>
                        ) : (
                            <>
                                <Zap size={20} />
                                Entrenar Modelo con GPU
                            </>
                        )}
                    </button>
                </>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    marginBottom: '1.5rem'
                }}>
                    {error}
                </div>
            )}

            {/* Resultados */}
            {result && (
                <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #10b98122 0%, #10b98111 100%)', borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                        <TrendingUp size={20} />
                        ✓ Modelo Entrenado Exitosamente
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>R² Score</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                {result.metrics?.r2_score?.toFixed(4) || 'N/A'}
                            </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loss</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                {result.metrics?.final_loss?.toFixed(6) || 'N/A'}
                            </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Muestras</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                                {result.metrics?.samples?.toLocaleString() || 'N/A'}
                            </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Features</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                                {result.metrics?.features || 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Model ID:</div>
                        <code style={{ fontSize: '0.9rem', color: '#fff', wordBreak: 'break-all' }}>
                            {result.model_id}
                        </code>
                    </div>

                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        Dispositivo usado: <strong style={{ color: result.device?.includes('cuda') ? '#10b981' : '#f59e0b' }}>{result.device}</strong>
                    </div>
                </div>
            )}

            {/* Spinner CSS */}
            <style>{`
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
