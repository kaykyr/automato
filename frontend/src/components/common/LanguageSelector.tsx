import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className }) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', label: t('language.selector.english'), flag: '🇺🇸' },
    { code: 'pt-BR', label: t('language.selector.portuguese'), flag: '🇧🇷' }
  ];

  // Normalizar o idioma atual para match correto
  const normalizeLanguage = (lang: string) => {
    if (lang.startsWith('pt')) return 'pt-BR';
    if (lang.startsWith('en')) return 'en';
    return lang;
  };

  const currentLanguage = languages.find(lang => lang.code === normalizeLanguage(i18n.language)) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Força atualização do localStorage
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className={`language-selector ${className || ''}`}>
      <div className="language-selector-trigger">
        <Globe size={14} />
        <span className="current-language">
          <span className="flag">{currentLanguage.flag}</span>
          <span className="label">{currentLanguage.code.toUpperCase()}</span>
        </span>
      </div>
      
      <div className="language-dropdown">
        {languages.map((language) => (
          <button
            key={language.code}
            className={`language-option ${i18n.language === language.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(language.code)}
          >
            <span className="flag">{language.flag}</span>
            <span className="label">{language.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};