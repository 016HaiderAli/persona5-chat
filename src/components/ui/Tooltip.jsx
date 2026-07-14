import React from 'react';
import classNames from 'classnames';

export default function Tooltip({ children, label, className }) {
  return (
    <span className={classNames('ui-tooltip', className)} aria-label={label} title={label}>
      {children}
    </span>
  );
}
