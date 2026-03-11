// src/components/ConfirmModal.tsx
import React from "react";

interface ConfirmModalProps {
  title?: string;
  message?: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title = "Confirm", message, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded p-6 w-96">
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
