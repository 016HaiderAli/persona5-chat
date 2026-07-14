import React from 'react';
export default function Card({ children, className, ...props }) {
  const cls = ['ui-card', className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
