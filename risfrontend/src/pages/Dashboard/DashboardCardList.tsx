import React from "react";

interface Props {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
}

const DashboardCard: React.FC<Props> = ({ title, value, icon }) => {
  return (
    <div className="bg-white shadow rounded p-4 flex items-center space-x-4">
      {icon && <div className="text-2xl">{icon}</div>}
      <div>
        <div className="text-gray-500">{title}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
};

export default DashboardCard;

export {};
