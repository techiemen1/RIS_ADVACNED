import React, { useState, FormEvent } from "react";

interface PatientFormProps {
  onSubmit: (data: any) => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, age });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Patient Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <input
        type="number"
        placeholder="Age"
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
        className="border p-2 rounded w-full"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  );
};

export default PatientForm;
export {};
