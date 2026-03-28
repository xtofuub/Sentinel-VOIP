import React from 'react';

export const LanguageSelector = ({ languages, selectedLanguage, onSelect }) => {
  return (
    <div className="input-container">
      <label>Select Language</label>
      <select 
        value={selectedLanguage} 
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>Select a country...</option>
        {languages.map((lang) => (
          <option key={lang._id} value={lang._id}>
            {lang.tname}
          </option>
        ))}
      </select>
    </div>
  );
};
