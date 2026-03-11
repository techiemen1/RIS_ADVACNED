// src/components/cards/DashboardCard.tsx
import React from "react";
import AppIcon from "../AppIcon";
import { IconType } from "react-icons";

interface DashboardCardProps {
  title: string;
  count: number | string;
  Icon?: IconType | null;
  color?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, count, Icon, color = "bg-white" }) => {
  return (
    <div className={`rounded-lg shadow p-4 flex items-center justify-between ${color}`}>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
      <div className="bg-white/20 p-2 rounded-full">
        {Icon ? <AppIcon Icon={Icon} size={28} /> : null}
      </div>
    </div>
  );
};

export default DashboardCard;
