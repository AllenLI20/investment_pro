import React from 'react';

const Logo = ({ size = '1.5rem', className = '' }) => {
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
      {/* 主报纸背景 */}
      <rect x="3" y="3" width="18" height="18" rx="1" fill="#f8f9fa" />
      
      {/* 报纸折角效果 */}
      <path
        d="M17 3l4 4v-4h-4z"
        fill="#e9ecef"
      />
      
      {/* 报纸标题线条 */}
      <path
        d="M6 8h12"
        stroke="#495057"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* 报纸内容线条 */}
      <path
        d="M6 12h8M6 15h10"
        stroke="#868e96"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* 报纸边框 */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="1"
        stroke="#495057"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
};

export default Logo; 