import React from 'react';

export default function Spinner({ size = 20 }) {
  return <div className="ui-spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}
