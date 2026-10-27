import React from 'react';

/** Inline SVG icon set — no icon library dependency. */
const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />,
  play: <path d="M6 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M8 5v14M16 5v14" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  check: <path d="M20 6 9 17l-5-5" />,
  flame: (
    <path d="M12 2c1 4-4 5.5-4 10a4.5 4.5 0 0 0 9 0c0-1.5-.7-2.6-1.4-3.6C14 9.5 13 7 12 2Zm-1.2 10.8c.2 1.4 1.2 2.2 2.2 2.2a2.3 2.3 0 0 0 .6-1.6c0-1-.6-1.8-1.2-2.6-.5.6-1.4 1.1-1.6 2Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 20a2 2 0 0 0 4 0" />,
  chevron: <path d="m9 6 6 6-6 6" />,
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
