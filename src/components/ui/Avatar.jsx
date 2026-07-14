import React from 'react';
export default function Avatar({ src, alt = 'avatar', size = 40, className }) {
  const style = { width: size, height: size };
  const cls = ['ui-avatar', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      {src ? <img src={src} alt={alt} /> : <div className="ui-avatar__fallback" />}
    </div>
  );
}
