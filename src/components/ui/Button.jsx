import React from 'react';
export default function Button({ children, className, variant = 'primary', ...props }) {
  const base = 'ui-btn';
  const cls = [base, `${base}--${variant}`, className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
