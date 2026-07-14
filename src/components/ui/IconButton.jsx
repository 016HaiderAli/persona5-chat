import React from 'react';
export default function IconButton({ children, className, ...props }) {
  const cls = ['ui-icon-btn', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
