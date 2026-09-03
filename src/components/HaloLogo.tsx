import React from 'react';

interface HaloLogoProps {
  className?: string;
  size?: number | string;
}

export const HaloLogo: React.FC<HaloLogoProps> = ({ className = 'w-4 h-4', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Black Disc */}
      <circle cx="50" cy="50" r="48" fill="#0C0D11" />

      {/* Main Lime-Green Ring Body */}
      {/* Defined with mask to create the crisp diagonal cutout for the white bar */}
      <mask id="halo-logo-cutout">
        <rect width="100" height="100" fill="white" />
        {/* Cutout slot for the diagonal bar angled at 45 deg */}
        <path
          d="M42 58 L78 22 L68 12 L32 48 Z"
          fill="black"
        />
      </mask>

      {/* Lime Green Ring with Cutout */}
      <path
        d="M 50 14 A 36 36 0 1 1 49.9 14 Z M 50 30 A 20 20 0 1 0 50.1 30 Z"
        fill="#C4EE00"
        fillRule="evenodd"
        mask="url(#halo-logo-cutout)"
      />

      {/* Inner Black Core */}
      <circle cx="50" cy="50" r="20" fill="#0C0D11" />

      {/* Diagonal White Bar / Power Indicator */}
      {/* Rotated ~45 degrees pointing towards top-right */}
      <polygon
        points="43,53 51,61 74,38 66,30"
        fill="#FFFFFF"
      />

      {/* Outer Left Accent White Dot */}
      <circle cx="10" cy="58" r="5.5" fill="#FFFFFF" />
    </svg>
  );
};
