// src/pages/Admin/UserManagement.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import LoadingOverlay from "../../layout/LoadingOverlay";
import { useRBAC } from "../../context/RoleContext";

type User = {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role?: string;
  phone_number?: string;
  employee_id?: string;
  profile_picture?: string;
  is_active?: boolean;
};

const defaultForm = {
  id: null as number | null,
  username: "",
  full_name: "",
  email: "",
  password: "",
  role: "staff",
  phone_number: "",
  employee_id: "",
  npi_number: "",
  specialty: "",
  license_number: "",
  department: "",
  institution: "",
  notes: "",
  language_preference: "",
  timezone: "",
  can_order: false,
  can_report: false,
  can_schedule: false,
  is_active: true,
};

const UserManagement: React.FC = () => {
  // always call hooks at top level
  const rb = useRBAC();
  const currentUser = rb.user;

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Reference Data
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);

  // Access control
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== "admin") {
      setMessage("Access denied: Admins only.");
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/users");
      const data = res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("fetchUsers", err);
      setMessage("❌ Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Load reference data
    axiosInstance.get("/settings").then((r) => {
      const d = r.data?.data || {};
      setDepartments(d["hierarchy.departments"] || ["Radiology"]);
      setDesignations(d["hierarchy.designations"] || ["Staff"]);
    }).catch(console.error);
  }, []);

  const saveUser = async () => {
    if (!form.username || !form.email || !form.full_name) {
      setMessage("⚠️ Fill username, full name and email.");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        phone_number: form.phone_number || null,
        employee_id: form.employee_id || null,
        npi_number: form.npi_number || null,
        specialty: form.specialty || null,
        license_number: form.license_number || null,
        department: form.department || null,
        institution: form.institution || null,
        notes: form.notes || null,
        language_preference: form.language_preference || null,
        timezone: form.timezone || null,
        can_order: Boolean(form.can_order),
        can_report: Boolean(form.can_report),
        can_schedule: Boolean(form.can_schedule),
        is_active: Boolean(form.is_active),
        designation: (form as any).designation || null,
        registration_number: (form as any).registration_number || null,
      };

      // Only include password for create or when user typed a new password
      if (!form.id && form.password) payload.password = form.password;
      if (form.id && form.password) payload.password = form.password;

      if (form.id) {
        await axiosInstance.put(`/users/${form.id}`, payload);
        setMessage("✅ User updated.");
      } else {
        const res = await axiosInstance.post("/users", { ...payload, password: form.password });
        // if backend returns created user in data:
        const created = res.data?.data;
        setForm({ ...defaultForm, id: created?.id ?? null });
        setMessage("✅ User created.");
      }

      fetchUsers();
    } catch (err: any) {
      console.error("saveUser error", err);
      setMessage(`❌ Failed to save user: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !form.id) {
      setMessage("⚠️ Select a user first to upload avatar.");
      return;
    }

    const fd = new FormData();
    fd.append("profile_picture", file);

    try {
      setLoading(true);
      await axiosInstance.post(`/users/${form.id}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Profile picture uploaded.");
      fetchUsers();
    } catch (err) {
      console.error("avatar upload", err);
      setMessage("❌ Failed to upload profile picture.");
    } finally {
      setLoading(false);
    }
  };

  const editUser = (u: User) => {
    setForm({ ...defaultForm, ...u, password: "" });
    setMessage(null);
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setLoading(true);
      const res = await axiosInstance.delete(`/users/${id}`);
      setMessage(res.data?.message || "🗑️ User deleted.");
      fetchUsers();
    } catch (err: any) {
      console.error("deleteUser", err);
      setMessage(`❌ Failed to delete user: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [signatureLoading, setSignatureLoading] = useState(false);

  const handleSignatureUpload = async (file?: File) => {
    if (!file || !form.id) {
      setMessage("⚠️ Select a user first to upload signature.");
      return;
    }

    const fd = new FormData();
    fd.append("signature", file);

    try {
      setSignatureLoading(true);
      await axiosInstance.post(`/users/${form.id}/signature`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Signature uploaded.");
      fetchUsers();
    } catch (err: any) {
      console.error("signature upload", err);
      setMessage(`❌ Failed to upload signature: ${err.response?.data?.error || err.message}`);
    } finally {
      setSignatureLoading(false);
    }
  };

  // If not admin, show a message (hooks already called)
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">Access denied. Admins only.</p>
            <p className="text-sm mt-2">You must be an admin to manage users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 relative max-w-7xl mx-auto animate-fade-in">
      {loading && <LoadingOverlay message="Processing..." />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">User Management</h1>
          <p className="text-slate-500 mt-1">Manage system access, roles, and digital signatures.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-xs font-mono text-slate-500">
            Total Users: <span className="font-bold text-slate-900">{users.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`premium-card ${form.id ? 'border-sky-200 shadow-sky-100' : ''}`}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {form.id ? "Edit User" : "Add New User"}
                {form.id && <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">EDITING</span>}
              </h2>
            </div>

            <div className="space-y-4">
              <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="medical-input" />
              <Input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="medical-input" />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="medical-input" />
              <Input placeholder="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="medical-input" />
              <Input placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="medical-input" />
              <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="medical-input" />

              <div className="grid grid-cols-2 gap-3">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="medical-input">
                  <option value="admin">Admin</option>
                  <option value="radiologist">Radiologist</option>
                  <option value="technician">Technician</option>
                  <option value="staff">Staff</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                </select>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="medical-input"
                >
                  <option value="">Department...</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <Input placeholder="NPI Number" value={form.npi_number} onChange={(e) => setForm({ ...form, npi_number: e.target.value })} className="medical-input" />

              {/* Professional Details for Signature */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Details</h4>
                <Input placeholder="Designation (e.g. Consultant Radiologist)" value={(form as any).designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value } as any)} className="medical-input text-sm" />
                <Input placeholder="Registration Number (e.g. KMC-12345)" value={(form as any).registration_number || ""} onChange={(e) => setForm({ ...form, registration_number: e.target.value } as any)} className="medical-input text-sm" />
              </div>

              <select
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="medical-input"
              >
                <option value="">Select Specialty...</option>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="License Number" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="medical-input" />
                <Input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className="medical-input" />
              </div>

              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="medical-input" />

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permissions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                    <input type="checkbox" checked={form.can_order} onChange={(e) => setForm({ ...form, can_order: e.target.checked })} className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500" />
                    <span className="text-sm font-medium text-slate-700">Can Order</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                    <input type="checkbox" checked={form.can_report} onChange={(e) => setForm({ ...form, can_report: e.target.checked })} className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500" />
                    <span className="text-sm font-medium text-slate-700">Can Report</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                    <input type="checkbox" checked={form.can_schedule} onChange={(e) => setForm({ ...form, can_schedule: e.target.checked })} className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500" />
                    <span className="text-sm font-medium text-slate-700">Can Schedule</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                    <input type="checkbox" checked={(form as any).can_sign} onChange={(e) => setForm({ ...form, can_sign: e.target.checked } as any)} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                    <span className="text-sm font-medium text-slate-700">Can Sign</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white col-span-2">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                    <span className="text-sm font-medium text-slate-700">Active User</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Avatar</label>
                  <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Digital Signature</label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleSignatureUpload(e.target.files?.[0])} disabled={signatureLoading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all disabled:opacity-50" />
                    {signatureLoading && <span className="animate-spin text-indigo-600">⟳</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={saveUser} className="btn-premium-primary w-full shadow-lg shadow-blue-900/20">
                  {form.id ? "Update User" : "Create User"}
                </button>
                {form.id && (
                  <button className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setForm({ ...defaultForm })}>
                    Cancel
                  </button>
                )}
              </div>

              {message && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-medium animate-fade-in ${message.includes("failed") ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2">
          <div className="premium-card h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">All Users</h3>
              <div className="relative">
                <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 rounded-lg bg-slate-50 border-none text-sm focus:ring-2 focus:ring-slate-200" />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-slate-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Profile</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Identifier</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Role & Dept</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs text-center">Permissions</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3">
                        {u.profile_picture ? (
                          <img src={u.profile_picture} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{u.full_name || u.username}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        <div className="text-[10px] bg-slate-100 inline-block px-1.5 rounded mt-1 text-slate-500 font-mono">{u.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            u.role === 'radiologist' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              u.role === 'doctor' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                            {u.role}
                          </span>
                          {(u as any).department && <span className="text-xs text-slate-500">{(u as any).department}</span>}
                          {(u as any).designation && <span className="text-[10px] text-slate-400 italic">{(u as any).designation}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {(u as any).can_report && <span title="Can Report" className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100">📝</span>}
                          {(u as any).can_order && <span title="Can Order" className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs border border-blue-100">🛒</span>}
                          {(u as any).can_sign && <span title="Can Sign Reports" className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs border border-purple-100">✒️</span>}
                          {(u as any).signature_path ? (
                            <span title="Signature On File" className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs border border-indigo-100">✍️</span>
                          ) : (
                            <span title="Missing Signature" className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xs border border-amber-100">⚠️</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.is_active ?
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-4 ring-emerald-500/20"></span> :
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editUser(u)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-sky-600 transition-colors" title="Edit">
                            ✏️
                          </button>
                          <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                        No users found. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
