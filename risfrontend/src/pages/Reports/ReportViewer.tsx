import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../services/axiosInstance";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import ReportEditor from "../ReportEditor";
import dayjs from "dayjs";

/* ================= TYPES ================= */

type LocationState = {
  patientName?: string;
  patientID?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
};

/* ================= COMPONENT ================= */

export default function ReportViewer(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Router state (from ReportList / AddReport)
  const state = (location.state || {}) as LocationState;

  const [searchUID, setSearchUID] = useState(id || "");
  const [meta, setMeta] = useState<LocationState | null>(
    state?.patientName ? state : null
  );

  const [metaLoaded, setMetaLoaded] = useState<boolean>(
    Boolean(state?.patientName)
  );

  const [loadingMeta, setLoadingMeta] = useState(false);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);

  /* ================= LOAD STUDY META (ONCE) ================= */

  useEffect(() => {
    if (!id) return;

    // 🔒 If router already gave patient details → DO NOTHING
    if (metaLoaded) return;

    setLoadingMeta(true);
    setErrorMeta(null);

    axiosInstance
      .get(`/studies/${encodeURIComponent(id)}/meta`)
      .then((r) => {
        setMeta(r.data?.data || null);
        setMetaLoaded(true);
      })
      .catch((err) => {
        console.error("getStudyMeta error:", err);
        setErrorMeta("Failed to load patient details from PACS");
        setMetaLoaded(true);
      })
      .finally(() => setLoadingMeta(false));
  }, [id, metaLoaded]);

  /* ================= SUMMARY FOR HEADER + EDITOR ================= */

  const summary = useMemo(
    () => ({
      patientName: meta?.patientName,
      patientID: meta?.patientID,
      accessionNumber: meta?.accessionNumber,
      modality: meta?.modality,
      studyDate: meta?.studyDate,
    }),
    [meta]
  );

  /* ================= ACTIONS ================= */

  const goToUID = () => {
    const uid = searchUID.trim();
    if (!uid) return;
    navigate(`/reports/view/${encodeURIComponent(uid)}`);
  };

  const today = useMemo(
    () => dayjs().format("YYYY-MM-DD HH:mm"),
    []
  );

  /* ================= RENDER ================= */

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report Viewer</h1>
          <div className="text-xs text-gray-500">
            {loadingMeta
              ? "Loading patient details..."
              : errorMeta
              ? errorMeta
              : summary.patientName
              ? `Patient: ${summary.patientName} (${summary.patientID ?? "—"})`
              : "Patient details not available"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Enter Study UID..."
            value={searchUID}
            onChange={(e) => setSearchUID(e.target.value)}
            className="min-w-[260px]"
          />
          <Button onClick={goToUID}>Load</Button>
          <Button
            variant="outline"
            onClick={() => navigate("/reports")}
          >
            Back to list
          </Button>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            {today}
          </span>
        </div>
      </div>

      {/* REPORT */}
      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
        </CardHeader>
        <CardContent>
          {!id ? (
            <div className="text-sm text-gray-600">
              Enter a Study UID above and press Load.
            </div>
          ) : (
            <ReportEditor
              studyUID={id}
              initialPatient={summary}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

