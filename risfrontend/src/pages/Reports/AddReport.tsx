// src/pages/Reports/AddReport.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

type PACSServer = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  base_url?: string | null;
  aetitle?: string | null;
};

type StudyRow = {
  id: string;
  studyInstanceUID?: string;
  patientName?: string;
  patientID?: string;
  modality?: string;
  description?: string;
  date?: string;
  accessionNumber?: string;
  [k: string]: any;
};

const getDicomTag = (obj: any, tag: string) => {
  if (!obj || !obj[tag]) return "";
  const v = obj[tag].Value;
  if (!v || v.length === 0) return "";
  const first = v[0];
  if (typeof first === "object" && first.Alphabetic) return first.Alphabetic;
  return typeof first === "string" ? first : JSON.stringify(first);
};

const normalizeStudy = (s: any): StudyRow => {
  const patientName = s.patientName || s.PatientName || getDicomTag(s, "00100010") || "";
  const patientID = s.patientID || s.PatientID || getDicomTag(s, "00100020") || "";
  const studyUID = s.studyInstanceUID || s.StudyInstanceUID || getDicomTag(s, "0020000D") || s.id || "";
  const accession = s.accessionNumber || s.AccessionNumber || getDicomTag(s, "00080050") || "";
  let date = s.date || s.StudyDate || getDicomTag(s, "00080020") || "";
  if (/^\d{8}$/.test(date)) date = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
  const modality =
    s.modality ||
    (s.ModalitiesInStudy
      ? Array.isArray(s.ModalitiesInStudy)
        ? s.ModalitiesInStudy[0]
        : s.ModalitiesInStudy
      : "") ||
    getDicomTag(s, "00080060") ||
    "";
  const description = s.description || s.StudyDescription || getDicomTag(s, "00081030") || "";
  return {
    id: studyUID || Math.random().toString(36).slice(2),
    studyInstanceUID: studyUID,
    patientName,
    patientID,
    modality,
    date,
    accessionNumber: accession,
    description,
    ...s,
  };
};

export default function AddReport(): JSX.Element {
  const [servers, setServers] = useState<PACSServer[]>([]);
  const [selected, setSelected] = useState<PACSServer | null>(null);
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const navigate = useNavigate();

  const loadServers = useCallback(async () => {
    try {
      const r = await axiosInstance.get("/pacs");
      const list = r.data?.data ?? [];
      setServers(list);
      if (!selected && list.length) setSelected(list[0]);
    } catch (err) {
      console.error("loadServers", err);
      setServers([]);
    }
  }, [selected]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const fetchStudies = useCallback(
    async (srv?: PACSServer) => {
      const server = srv ?? selected;
      if (!server) return;
      setLoading(true);
      try {
        const r = await axiosInstance.get(`/pacs/${server.id}/studies`);
        const list = r.data?.data ?? [];
        const normalized = (Array.isArray(list) ? list : []).map(normalizeStudy);
        normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setStudies(normalized);
        setPage(1);
      } catch (err: any) {
        console.error("fetchStudies", err);
        alert(
          err?.response?.data?.message ||
            `Failed to fetch studies from PACS "${server.name}"`
        );
        setStudies([]);
      } finally {
        setLoading(false);
      }
    },
    [selected]
  );

  useEffect(() => {
    if (selected) fetchStudies(selected);
  }, [selected, fetchStudies]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return studies.filter((s) => {
      const matchesQ =
        !q ||
        (s.patientName || "").toLowerCase().includes(q) ||
        (s.patientID || "").toLowerCase().includes(q) ||
        (s.modality || "").toLowerCase().includes(q) ||
        (s.accessionNumber || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q);
      const matchesDate = !date || (s.date || "").startsWith(date);
      return matchesQ && matchesDate;
    });
  }, [studies, search, date]);

  useEffect(() => setPage(1), [search, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayed = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  const openReport = (s: StudyRow) => {
    const uid = s.studyInstanceUID ?? s.id;
    if (!uid) {
      alert("Study UID missing");
      return;
    }
    navigate(`/reports/view/${encodeURIComponent(uid)}`, {
      state: {
        patientName: s.patientName,
        patientID: s.patientID,
        accessionNumber: s.accessionNumber,
        modality: s.modality,
        studyDate: s.date,
      },
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Create / Attach Report</h1>
        <Button variant="outline" onClick={loadServers}>
          Reload PACS list
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select PACS & Study</CardTitle>
        </CardHeader>
        <CardContent>
          {/* PACS selector */}
          <div className="flex flex-wrap gap-3 mb-4">
            {servers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className={`px-3 py-2 rounded border text-sm ${
                  selected?.id === s.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-[11px]">
                  {s.type} • {s.host}:{s.port}
                </div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-3">
            <Input
              placeholder="Search name / ID / accession / modality"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[260px]"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setDate("");
              }}
            >
              Clear filters
            </Button>
          </div>

          {/* Table */}
          <div className="h-[540px] overflow-auto border rounded bg-white">
            {loading ? (
              <div className="py-10 text-center text-sm">Loading studies...</div>
            ) : displayed.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-600">
                No studies found.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Patient</th>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Modality</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Accession</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-2">{s.patientName || "—"}</td>
                      <td className="p-2">{s.patientID || "—"}</td>
                      <td className="p-2">{s.modality || "—"}</td>
                      <td className="p-2">
                        {s.date
                          ? dayjs(s.date).format("YYYY-MM-DD")
                          : "—"}
                      </td>
                      <td className="p-2">{s.accessionNumber || "—"}</td>
                      <td className="p-2">{s.description || "—"}</td>
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => openReport(s)}
                        >
                          Open Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-3">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <div className="px-2 text-sm">
                Page {page} / {totalPages}
              </div>
              <Button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
