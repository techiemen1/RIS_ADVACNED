import React from "react";

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-md">
        <p>{message}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
export {};
