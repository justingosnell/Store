import React from "react";

interface RibbonBadgeProps {
  children: React.ReactNode;
  className?: string;
  backgroundColor?: string;
}

export function RibbonBadge({ children, className = "", backgroundColor }: RibbonBadgeProps) {
  const style = backgroundColor ? { backgroundColor } : undefined;
  
  return (
    <div className={`ribbon-badge-custom ${className}`} style={style}>
      {children}
    </div>
  );
}