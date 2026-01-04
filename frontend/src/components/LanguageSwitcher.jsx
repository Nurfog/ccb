import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} color="#94a3b8" />
            <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
            >
                <option value="es">Español</option>
                <option value="en">English</option>
            </select>
        </div>
    );
};

export default LanguageSwitcher;
