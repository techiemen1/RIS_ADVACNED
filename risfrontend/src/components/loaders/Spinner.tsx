import React from "react";

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center">
    <div className="loader border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8 animate-spin"></div>
  </div>
);

export default Spinner;
export {};
