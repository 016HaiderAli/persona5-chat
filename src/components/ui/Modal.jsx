import React from 'react';
export default function Modal({ children, isOpen, onClose, className }) {
  if (!isOpen) return null;
  const cls = ['ui-modal-backdrop', className].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
