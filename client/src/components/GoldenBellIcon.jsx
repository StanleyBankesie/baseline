import React from "react";

/**
 * GoldenBellIcon
 * Faithful vector rendering of the user's golden notification bell with dark outline and clapper.
 * Designed with wide, plump, chubby proportions to match the user-provided reference.
 */
export default function GoldenBellIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {/* Clapper / Tongue extending below base */}
      <path
        d="M9.8 17.5C9.8 19.6 10.8 21.3 12 21.3C13.2 21.3 14.2 19.6 14.2 17.5H9.8Z"
        fill="#8C4A15"
        stroke="#111827"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {/* Chubby Bell Body - wide flared base with rounded bottom corners */}
      <path
        d="M12 2.8C10.7 2.8 10 3.7 10 4.6C8.1 5.8 6.5 8.2 6.3 11.4L6.1 13.5C5.8 15.1 4.7 16.4 3.4 17.1C2.8 17.4 3 18.2 3.7 18.2H20.3C21 18.2 21.2 17.4 20.6 17.1C19.3 16.4 18.2 15.1 17.9 13.5L17.7 11.4C17.5 8.2 15.9 5.8 14 4.6C14 3.7 13.3 2.8 12 2.8Z"
        fill="#FFC526"
        stroke="#111827"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {/* Subtle bottom rim shadow/contour for 3D depth */}
      <path
        d="M4.5 17.3C7.2 16.6 16.8 16.6 19.5 17.3"
        stroke="#E5A61E"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
