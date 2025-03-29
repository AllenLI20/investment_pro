import React from 'react';

const AnalysisLogo = ({ size = '1.5rem', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
    >
      {/* 背景 */}
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#f8f9fa" stroke="#495057" strokeWidth="1" />
      
      {/* 折线图 */}
      <path
        d="M6 17l4-4 3 2 5-6"
        stroke="#2ecc71"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 柱状图 */}
      <path
        d="M7 14v3M11 13v4M15 12v5M19 11v6"
        stroke="#3498db"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default AnalysisLogo; 