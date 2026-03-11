import React from "react";

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const PrimaryButton: React.FC<Props> = ({ children, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
export {};

