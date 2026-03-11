import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PACS {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  base_url?: string;
  aetitle?: string;
}

interface Study {
  id: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  modality: string;
  description: string;
  studyInstanceUID: string;
}

const PACSViewer: React.FC = () => {
  const [pacsList, setPacsList] = useState<PACS[]>([]);
  const [selectedPacs, setSelectedPacs] = useState<number | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // 🔹 Fetch PACS servers
  useEffect(() => {
    const fetchPacs = async () => {
      try {
        const res = await axios.get("/api/pacs");
        if (res.data.success) setPacsList(res.data.data);
      } catch (err) {
        console.error("Failed to load PACS:", err);
      }
    };
    fetchPacs();
  }, []);

  // 🔹 Fetch studies from PACS
  const fetchStudies = async () => {
    if (!selectedPacs) return alert("Select a PACS first.");
    setLoading(true);
    try {
      const res = await axios.get(`/api/pacs/${selectedPacs}/studies`, {
        params: { q: search },
      });
      if (res.data.success) setStudies(res.data.data);
      else setStudies([]);
    } catch (err: any) {
      alert("❌ Failed to load studies: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Open in OHIF or Oviyam
  const openViewer = (study: Study, viewer: "ohif" | "oviyam") => {
    const pacs = pacsList.find((p) => p.id === selectedPacs);
    if (!pacs) return alert("Select a PACS first.");

    let url = "";
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Determine base URL dynamically
    if (viewer === "ohif") {
      // Use configured URL or fallback to current host on port 3000
      const baseUrl = pacs.base_url || `${protocol}//${hostname}:3000/ohif`;
      url = `${baseUrl}?studyUID=${study.studyInstanceUID}`;
    } else {
      // Oviyam usually runs on port 8080
      const baseUrl = pacs.base_url || `${protocol}//${hostname}:8080/oviyam`;
      url = `${baseUrl}?studyUID=${study.studyInstanceUID}`;
    }
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PACS Study Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PACS selection */}
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedPacs || ""}
              onChange={(e) => setSelectedPacs(Number(e.target.value))}
              className="border rounded-md p-2 min-w-[200px]"
            >
              <option value="">Select PACS</option>
              {pacsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>

            <Input
              placeholder="Search by Patient Name / ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button onClick={fetchStudies} disabled={loading}>
              {loading ? "Loading..." : "🔍 Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Study Table */}
      <Card className="shadow-lg border">
        <CardHeader>
          <CardTitle>Studies</CardTitle>
        </CardHeader>
        <CardContent>
          {studies.length === 0 ? (
            <p className="text-gray-500">No studies found.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Patient Name</th>
                  <th className="p-2 border">Patient ID</th>
                  <th className="p-2 border">Study Date</th>
                  <th className="p-2 border">Modality</th>
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => (
                  <tr key={study.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{study.patientName}</td>
                    <td className="p-2 border">{study.patientID}</td>
                    <td className="p-2 border">{study.studyDate}</td>
                    <td className="p-2 border">{study.modality}</td>
                    <td className="p-2 border">{study.description}</td>
                    <td className="p-2 border space-x-2">
                      <Button onClick={() => openViewer(study, "ohif")}>🖼 OHIF</Button>
                      <Button variant="secondary" onClick={() => openViewer(study, "oviyam")}>
                        📂 Oviyam
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PACSViewer;
