import React from 'react';
export default function Badge({ children, className }) {
  const cls = ['ui-badge', className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
