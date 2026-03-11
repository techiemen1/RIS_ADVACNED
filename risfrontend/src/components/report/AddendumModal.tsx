// src/components/report/AddendumModal.tsx
import React, { useState } from "react";
import axiosInstance from "../../services/axiosInstance";

export default function AddendumModal({ studyUID, onClose }) {
  const [content, setContent] = useState("");

  const submit = async () => {
    await axiosInstance.post("/reports/addendum", {
      studyUID,
      content
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 w-[600px] rounded">
        <h3 className="font-semibold mb-2">Add Addendum</h3>
        <textarea
          className="w-full h-40 border p-2"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <div className="mt-3 flex gap-2 justify-end">
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit}>Submit Addendum</button>
        </div>
      </div>
    </div>
  );
}

