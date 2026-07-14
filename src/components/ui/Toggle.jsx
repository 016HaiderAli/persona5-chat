import React from 'react';
export default function Toggle({ checked, onChange, className, ariaLabel }) {
  const cls = ['ui-toggle', className].filter(Boolean).join(' ');
  return (
    <label className={cls} aria-label={ariaLabel}>
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      <span className="ui-toggle__track" />
    </label>
  );
}
