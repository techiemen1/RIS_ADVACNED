// src/pages/Patients/PatientList.tsx

import React from "react";


const PatientList: React.FC = () => {
  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Assuming we have a service or use axios direct
    // Only fetching mainly for demo, this should be paginated
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/patients?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (Array.isArray(json)) setPatients(json);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchPatients();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Patient List</h1>
        <a href="/patients/register" className="bg-blue-600 text-white px-4 py-2 rounded">New Patient</a>
      </div>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">MRN / ID</th>
            <th className="p-3 border">Name</th>
            <th className="p-3 border">Age/Gender</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>}
          {!loading && patients.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="p-3 border font-mono text-blue-600">{p.mrn || p.id}</td>
              <td className="p-3 border font-medium">{p.first_name} {p.last_name}</td>
              <td className="p-3 border">{p.dob ? `${new Date().getFullYear() - new Date(p.dob).getFullYear()}y` : 'N/A'} / {p.gender}</td>
              <td className="p-3 border">
                <button className="text-blue-500 hover:underline">View</button>
              </td>
            </tr>
          ))}
          {!loading && patients.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No patients found</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default PatientList;
