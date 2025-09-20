"use client";

import React from "react";

export const ThermometerIcon = ({ color = "#60A5FA", size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 14.76V5a2 2 0 10-4 0v9.76a4 4 0 104 0z" />
    <path d="M10 9h4" />
  </svg>
);

export const DropletIcon = ({ color = "#60A5FA", size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" />
  </svg>
);

export const LightIcon = ({ color = "#60A5FA", size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const WaveIcon = ({ color = "#60A5FA", size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4" />
  </svg>
);
