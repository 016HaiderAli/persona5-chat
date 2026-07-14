import React from 'react';
export default function TextArea({ className, ...props }) {
  const cls = ['ui-textarea', className].filter(Boolean).join(' ');
  return <textarea className={cls} {...props} />;
}
