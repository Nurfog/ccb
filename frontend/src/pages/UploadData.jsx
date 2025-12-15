import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import ClientAutocomplete from '../components/ClientAutocomplete';

export default function UploadData() {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [msg, setMsg] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setMsg('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        // Si es root, exigir seleccion de cliente
        if (user.role === 'root' && !selectedClient) {
            setStatus('error');
            setMsg('Debe seleccionar una empresa para asociar los datos.');
            return;
        }

        setStatus('uploading');
        const formData = new FormData();
        formData.append('file', file);
        if (user.role === 'root' && selectedClient) {
            formData.append('target_client_id', selectedClient.id);
        }

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en la subida');

            setStatus('success');
            setMsg(`Archivo procesado: ${data.rows_inserted} filas insertadas.`);
            setFile(null); // Limpiar archivo después de éxito
        } catch (err) {
            setStatus('error');
            setMsg(err.message);
        }
    };

    return (
        <div className="center-content">
            <div className="card" style={{ width: '100%', maxWidth: '550px' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-ghost"
                    style={{ marginBottom: '2rem', paddingLeft: 0, justifyContent: 'flex-start' }}
                >
                    <ArrowLeft size={20} /> Volver al Dashboard
                </button>

                <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <UploadCloud size={32} color="#3b82f6" />
                    Cargar Datos
                </h2>
                <p style={{ marginBottom: '2rem' }}>
                    Sube tus archivos históricos (CSV o Excel) para entrenar el modelo.
                </p>

                {user.role === 'root' && (
                    <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px dashed #475569' }}>
                        <label className="form-label" style={{ marginBottom: '1rem', color: '#fbbf24' }}>
                            Modo Root: Seleccionar Empresa Destino
                        </label>
                        <ClientAutocomplete onSelect={setSelectedClient} />
                        {selectedClient && <div style={{ marginTop: '0.5rem', color: '#4ade80' }}>✔ {selectedClient.name}</div>}
                    </div>
                )}

                <div
                    style={{
                        border: '2px dashed #475569',
                        borderRadius: '12px',
                        padding: '3rem',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        transition: 'border-color 0.2s',
                        marginBottom: '1.5rem',
                        position: 'relative'
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#475569'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#475569';
                        if (e.dataTransfer.files[0]) {
                            setFile(e.dataTransfer.files[0]);
                            setStatus('idle');
                            setMsg('');
                        }
                    }}
                >
                    <FileSpreadsheet size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                    {file ? (
                        <div>
                            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>{file.name}</strong>
                            <span style={{ color: '#94a3b8' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    ) : (
                        <>
                            <p style={{ color: '#fff', fontWeight: '500', marginBottom: '0.5rem' }}>Arrastra y suelta tu archivo aquí</p>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>o haz click para seleccionar</p>
                        </>
                    )}
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".csv, .xlsx, .xls"
                        style={{
                            opacity: 0,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                {status === 'success' && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle size={20} /> {msg}
                    </div>
                )}
                {status === 'error' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={20} /> {msg}
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={!file || status === 'uploading'}
                >
                    {status === 'uploading' ? 'Procesando...' : 'Subir Archivo'}
                </button>
            </div>
        </div>
    );
}
