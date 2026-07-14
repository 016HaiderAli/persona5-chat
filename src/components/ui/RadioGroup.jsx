import React from 'react';
export default function RadioGroup({ options = [], name, value, onChange, className }) {
  const cls = ['ui-radio-group', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="radiogroup">
      {options.map((opt) => (
        <label key={opt.value} className="ui-radio">
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
