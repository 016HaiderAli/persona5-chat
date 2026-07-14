import React from 'react';

export default function Divider({ className }) {
  return <hr className={`ui-divider ${className || ''}`} />;
}
