import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ClientAutocomplete({ onSelect, isPublic = false, placeholder = "Buscar empresa..." }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const { token } = useAuth();

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchClients();
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300); // Debounce

        return () => clearTimeout(timer);
    }, [query]);

    const searchClients = async () => {
        setLoading(true);
        const endpoint = isPublic ? '/api/public/clients/search' : '/api/clients/search';
        const headers = isPublic ? {} : { 'Authorization': `Bearer ${token}` };

        try {
            const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                setIsOpen(true);
            }
        } catch (e) {
            console.error("Error searching clients", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (client) => {
        setQuery(client.name);
        setResults([]);
        setIsOpen(false);
        onSelect(client);
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 12px 12px 40px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif"
    };

    const dropdownStyle = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        marginTop: '4px',
        zIndex: 1000,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        maxHeight: '200px',
        overflowY: 'auto'
    };

    const itemStyle = {
        padding: '10px 15px',
        cursor: 'pointer',
        color: '#cbd5e1',
        borderBottom: '1px solid #334155'
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.6)' }} />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
            />
            {loading && <div style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>...</div>}

            {isOpen && results.length > 0 && (
                <div style={dropdownStyle}>
                    {results.map(client => (
                        <div
                            key={client.id}
                            style={itemStyle}
                            onMouseEnter={(e) => e.target.style.background = '#334155'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                            onClick={() => handleSelect(client)}
                        >
                            {client.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
