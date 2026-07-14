import React from 'react';

export default function Skeleton({ width = '100%', height = 16, className = '' }) {
  return <div className={`ui-skeleton ${className}`} style={{ width, height }} />;
}
