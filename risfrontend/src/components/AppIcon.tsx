// src/components/AppIcon.tsx
import React from "react";
import { IconType } from "react-icons";

interface AppIconProps {
  Icon: IconType;
  size?: number;
  className?: string;
}

const AppIcon: React.FC<AppIconProps> = ({ Icon, size = 20, className }) => {
  if (!Icon) return null;
  const IconComp = Icon as React.ComponentType<any>;
  return <IconComp size={size} className={className} />;
};

export default AppIcon;
