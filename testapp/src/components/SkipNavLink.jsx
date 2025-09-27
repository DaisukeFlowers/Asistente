import React from 'react';

// Accessible skip navigation link
export function SkipNavLink({ target = '#main', children = 'Skip to content' }) {
  return <a href={target} className="skip-link">{children}</a>;
}