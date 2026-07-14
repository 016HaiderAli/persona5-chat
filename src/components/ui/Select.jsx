import React from 'react';
export default function Select({ children, className, ...props }) {
  const cls = ['ui-select', className].filter(Boolean).join(' ');
  return (
    <select className={cls} {...props}>
      {children}
    </select>
  );
}
