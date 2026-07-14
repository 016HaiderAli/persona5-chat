import React from 'react';

export default function Section({ title, description, children, className }) {
  return (
    <section className={`ui-section ${className || ''}`}>
      {title && <h3 className="ui-section__title">{title}</h3>}
      {description && <p className="ui-section__desc">{description}</p>}
      <div className="ui-section__body">{children}</div>
    </section>
  );
}
