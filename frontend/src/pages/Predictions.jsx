import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Play, Database, Info, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Predictions() {
    const { t } = useTranslation();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [modelDetail, setModelDetail] = useState(null);
    const [formData, setFormData] = useState({});
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingDetail, setFetchingDetail] = useState(false);
    const [error, setError] = useState('');

    // Batch Mode State
    const [mode, setMode] = useState('single'); // 'single' | 'batch'
    const [batchFile, setBatchFile] = useState(null);

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
                setModels(data.models || []);
            }
        } catch (e) {
            console.error('Error fetching models', e);
        }
    };

    const fetchModelDetail = async (modelId) => {
        setFetchingDetail(true);
        setError('');
        try {
            const res = await fetch(`/api/ml/models/${modelId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setModelDetail(data);
                // Inicializar form data
                const initialForm = {};
                Object.keys(data.feature_metadata).forEach(key => {
                    if (key !== 'stats') {
                        initialForm[key] = '';
                    }
                });
                setFormData(initialForm);
            }
        } catch (e) {
            setError('Error cargando detalles del modelo');
        } finally {
            setFetchingDetail(false);
        }
    };

    useEffect(() => {
        if (selectedModel) {
            fetchModelDetail(selectedModel.id);
        } else {
            setModelDetail(null);
            setFormData({});
        }
        setPrediction(null);
        setBatchFile(null);
        setError('');
    }, [selectedModel]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        if (mode === 'batch') {
            handleBatchPredict(e);
            return;
        }

        setLoading(true);
        setError('');
        setPrediction(null);

        try {
            const res = await fetch('/api/ml/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    model_id: selectedModel.id,
                    data: [formData]
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Error en predicción');

            setPrediction(data.predictions[0]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchPredict = async (e) => {
        e.preventDefault();
        if (!batchFile) {
            setError('Por favor sube un archivo CSV o Excel');
            return;
        }

        setLoading(true);
        setError('');

        const formDataBatch = new FormData();
        formDataBatch.append('model_id', selectedModel.id);
        formDataBatch.append('file', batchFile);

        try {
            const res = await fetch('/api/ml/batch-predict', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataBatch
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Error en predicción por lotes');
            }

            // Download file
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `predictions_${selectedModel.target}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1000px' }}>
            <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-ghost"
                style={{ marginBottom: '2rem', paddingLeft: 0 }}
            >
                <ArrowLeft size={20} /> {t('common.back')}
            </button>

            <h1 style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                <Activity size={32} style={{ color: '#ec4899' }} />
                {t('predictions.title')}
            </h1>
            <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>
                {t('predictions.subtitle')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Selector de Modelo */}
                <div>
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Database size={20} />
                            {t('predictions.select_model')}
                        </h3>
                        {models.length === 0 ? (
                            <p style={{ color: '#64748b' }}>{t('predictions.no_models')}</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                                {models.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={() => setSelectedModel(m)}
                                        style={{
                                            padding: '1rem',
                                            background: selectedModel?.id === m.id ? '#ec489922' : 'rgba(255,255,255,0.03)',
                                            border: selectedModel?.id === m.id ? '2px solid #ec4899' : '1px solid #334155',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{m.type.toUpperCase()} - {m.target}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                            ID: {m.id.substring(0, 8)}... | R²: {m.metrics?.r2_score?.toFixed(4) || 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {modelDetail && (
                        <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#94a3b8' }}>
                                <Info size={18} />
                                {t('predictions.model_details')}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <div style={{ color: '#64748b' }}>{t('predictions.target')}:</div>
                                    <div style={{ color: '#fff' }}>{modelDetail.target}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b' }}>{t('predictions.type')}:</div>
                                    <div style={{ color: '#fff' }}>{modelDetail.type}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b' }}>{t('predictions.trained_date')}:</div>
                                    <div style={{ color: '#fff' }}>{new Date(modelDetail.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Formulario de Inferencia */}
                <div>
                    {selectedModel ? (
                        fetchingDetail ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <span className="spinner"></span>
                                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Cargando metadata del modelo...</p>
                            </div>
                        ) : modelDetail ? (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                                    <button
                                        onClick={() => setMode('single')}
                                        className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                    >
                                        <Activity size={18} /> Individual
                                    </button>
                                    <button
                                        onClick={() => setMode('batch')}
                                        className={`btn ${mode === 'batch' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                    >
                                        <FileSpreadsheet size={18} /> Por Lotes
                                    </button>
                                </div>

                                <form onSubmit={handlePredict}>
                                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>
                                        {mode === 'single' ? t('predictions.input_data') : 'Carga de Archivo (Excel/CSV)'}
                                    </h3>

                                    {mode === 'single' ? (
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {Object.entries(modelDetail.feature_metadata).map(([field, meta]) => {
                                                if (field === 'stats') return null;

                                                return (
                                                    <div key={field} className="form-group">
                                                        <label className="form-label">{field}</label>
                                                        {meta.type === 'categorical' ? (
                                                            <select
                                                                className="form-input"
                                                                value={formData[field] || ''}
                                                                onChange={(e) => handleInputChange(field, e.target.value)}
                                                                required
                                                            >
                                                                <option value="">{t('predictions.select_option')}</option>
                                                                {meta.uniques.map(val => (
                                                                    <option key={val} value={val}>{val}</option>
                                                                ))}
                                                            </select>
                                                        ) : field.toLowerCase().includes('fecha') || field.toLowerCase().includes('date') ? (
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                value={formData[field] || ''}
                                                                onChange={(e) => handleInputChange(field, e.target.value)}
                                                                required
                                                            />
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="form-input"
                                                                placeholder={`Ingresa ${field}`}
                                                                value={formData[field] || ''}
                                                                onChange={(e) => handleInputChange(field, e.target.value)}
                                                                required
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '2rem',
                                            border: '2px dashed #94a3b8',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: 'rgba(255,255,255,0.02)'
                                        }} onClick={() => document.getElementById('file-upload').click()}>
                                            <input
                                                id="file-upload"
                                                type="file"
                                                accept=".csv, .xlsx, .xls"
                                                style={{ display: 'none' }}
                                                onChange={(e) => setBatchFile(e.target.files[0])}
                                            />
                                            <Upload size={48} style={{ color: '#ec4899', marginBottom: '1rem' }} />
                                            {batchFile ? (
                                                <p style={{ color: '#fff', fontWeight: 'bold' }}>{batchFile.name}</p>
                                            ) : (
                                                <>
                                                    <p style={{ color: '#fff' }}>Click para subir archivo</p>
                                                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Soporta CSV y Excel</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || (mode === 'batch' && !batchFile)}
                                        className="btn btn-primary"
                                        style={{
                                            width: '100%',
                                            marginTop: '1.5rem',
                                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                            border: 'none'
                                        }}
                                    >
                                        {loading ? t('predictions.calculating') : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                {mode === 'single' ? <Play size={18} /> : <Download size={18} />}
                                                {mode === 'single' ? t('predictions.get_prediction') : 'Procesar y Descargar'}
                                            </span>
                                        )}
                                    </button>
                                </form>
                            </div>
                        ) : null
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: '2px dashed #334155',
                            color: '#64748b'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <Database size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p>{t('predictions.select_model')}</p>
                            </div>
                        </div>
                    )}

                    {/* Resultado Single */}
                    {mode === 'single' && prediction !== null && (
                        <div className="card" style={{
                            marginTop: '1.5rem',
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #ec489922 0%, #8b5cf611 100%)',
                            border: '1px solid #ec489955',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                {t('predictions.result_label')} <strong>{selectedModel.target}</strong>:
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                                {typeof prediction === 'number' ? prediction.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : prediction}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#ec4899', marginTop: '0.5rem' }}>
                                {t('predictions.based_on')} {selectedModel.id.substring(0, 8)}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: '#ef444422',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#f87171'
                        }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .spinner {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: #ec4899;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
