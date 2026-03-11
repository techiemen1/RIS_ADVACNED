/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, List as ListIcon, Search, LayoutGrid } from "lucide-react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import AppointmentScheduler from "../Schedule/AppointmentScheduler";
import { cn } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import { toast } from "react-hot-toast";

import { getModalityColors } from "../../utils/modalityColors";
import { getGenderColors } from "../../utils/genderColors";

dayjs.extend(isBetween);

type Appointment = {
  id?: number;
  patient_id?: string;
  patient_name?: string;
  modality?: string;
  accession_number?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  status?: string;
  created_at?: string;
  study_instance_uid?: string;
  patient_gender?: string;
  gender?: string;
  body_part?: string;
  scan_type?: string;
};

type ViewMode = 'list' | 'day' | 'week' | 'month';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function SchedulePage() { // Renamed component
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [modalities, setModalities] = useState<string[]>(["CT", "MR", "USG", "X-RAY"]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('day'); // Default to Control Tower Day View
  const [selectedModality, setSelectedModality] = useState("ALL"); // For Week/List views
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [prefillData, setPrefillData] = useState<{ start?: string, modality?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load Modalities
  useEffect(() => {
    const fetchMods = async () => {
      try {
        const r = await axiosInstance.get('/modalities');
        const list = Array.isArray(r.data) ? r.data : (r.data.data || []);
        if (list && Array.isArray(list)) {
          setModalities(list.filter((m: any) => m && m.name).map((m: any) => m.name));
        }
      } catch (e) {
        console.error("Failed to load modalities", e);
      }
    };
    fetchMods();
  }, []);

  // Date Calculations
  const startOfPeriod = useMemo(() => {
    if (viewMode === 'day') return currentDate.startOf('day');
    if (viewMode === 'month') return currentDate.startOf('month').startOf('week');
    if (viewMode === 'list') return currentDate.subtract(1, 'month');
    return currentDate.startOf('week').add(1, 'day'); // Monday
  }, [currentDate, viewMode]);

  const endOfPeriod = useMemo(() => {
    if (viewMode === 'day') return currentDate.endOf('day');
    if (viewMode === 'month') return currentDate.endOf('month').endOf('week');
    if (viewMode === 'list') return currentDate.add(1, 'month');
    return currentDate.startOf('week').add(6, 'day'); // Sunday
  }, [currentDate, viewMode]);

  const displayedDays = useMemo(() => {
    const days = [];
    let d = startOfPeriod.clone();
    while (d.isBefore(endOfPeriod) || d.isSame(endOfPeriod, 'day')) {
      days.push(d.clone());
      d = d.add(1, 'day');
    }
    return days;
  }, [startOfPeriod, endOfPeriod]);

  // Data Loading
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.get("/appointments", {
        params: {
          from: startOfPeriod.format("YYYY-MM-DDT00:00:00"),
          to: endOfPeriod.format("YYYY-MM-DDT23:59:59"),
        },
      });
      setAppointments(r.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startOfPeriod, endOfPeriod]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Filters (Global)
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    // In Day View, we show all modalities in columns, so we don't filter by selectedModality unless strictly needed.
    // But for Week/List views, we might respecting the pill filter.
    if (viewMode !== 'day' && selectedModality !== "ALL") {
      list = list.filter(a => a?.modality === selectedModality);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.patient_name || "").toLowerCase().includes(q) ||
        (a.accession_number || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, selectedModality, searchQuery, viewMode]);

  // Handlers
  const handleNav = (dir: 'prev' | 'next') => {
    const unit = viewMode === 'month' ? 'month' : (viewMode === 'day' ? 'day' : 'week');
    setCurrentDate(prev => dir === 'prev' ? prev.subtract(1, unit) : prev.add(1, unit));
  };

  const handleSlotClick = (day: dayjs.Dayjs, hour: number, modality?: string) => {
    const time = day.hour(hour).minute(0).second(0).format();
    setEditing(null);
    setPrefillData({ start: time, modality });
    setShowModal(true);
  };

  const handleEventClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation();
    setEditing(appt);
    setPrefillData(null);
    setShowModal(true);
  };

  const handleDeleteAppt = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (!id || !window.confirm("Cancel this appointment?")) return;
    try {
      await axiosInstance.delete(`/appointments/${id}`);
      toast.success("Appointment Cancelled");
      loadAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel");
    }
  };

  // Helper renderer
  const renderEvent = (appt: Appointment, isSmall = false) => {
    const colors = getModalityColors(appt.modality);

    return (
      <div
        key={appt.id}
        onClick={(e) => handleEventClick(e, appt)}
        className={cn(
          "pointer-events-auto rounded-md border shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md overflow-hidden relative group",
          isSmall ? "p-1 text-[9px] truncate" : "p-2 text-[10px]",
          "bg-white border-l-4",
          colors.border
        )}
      >
        {/* Background tint based on modality */}
        <div className={cn("absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20", colors.bg)}></div>

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getGenderColors(appt.patient_gender || appt.gender).indicator)}></div>
            <div className="font-bold text-slate-800 truncate leading-tight tracking-tight">{appt.patient_name}</div>
          </div>
          {!isSmall && (
            <>
              {(appt.body_part || appt.scan_type) && (
                <div className="text-[8px] font-black uppercase text-slate-400 mt-1 flex items-center gap-1">
                  <span className="truncate">{appt.body_part || 'General'}</span>
                  {appt.scan_type && <span className="opacity-50">/ {appt.scan_type}</span>}
                </div>
              )}
              <div className="flex justify-between items-center text-[9px] font-semibold text-slate-500 mt-1">
                {viewMode !== 'day' && (
                  <span className={cn("px-1 py-0.5 rounded-[3px] text-[8px] uppercase tracking-wider", colors.bg, colors.text)}>
                    {appt.modality}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 opacity-70" />
                  {dayjs(appt.scheduled_start).format("h:mm A")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Delete button on hover */}
        {!isSmall && (
          <button
            onClick={(e) => handleDeleteAppt(e, appt.id)}
            className="absolute top-1 right-1 p-1 rounded-md bg-white/80 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 border border-slate-100 shadow-sm z-20"
          >
            <Search className="w-3 h-3 rotate-45" /> {/* Use search as a 'close' icon proxy or a specific icon */}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-white font-sans text-slate-900">

      {/* --- HEADER --- */}
      <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 flex items-center gap-2">
              Radiology Scheduler
            </h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> {currentDate.format("MMMM D, YYYY")}
            </p>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            {(['day', 'week', 'month', 'list'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => { setViewMode(v); if (v === 'month' || v === 'list') setCurrentDate(dayjs()); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-all flex items-center gap-2",
                  viewMode === v ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {v === 'day' && <LayoutGrid className="w-3 h-3" />}
                {v === 'list' && <ListIcon className="w-3 h-3" />}
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {viewMode === 'list' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9 w-48 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
          )}

          {/* Modality Filter Pills - Only for NON-DAY views */}
          {viewMode !== 'day' && (
            <div className="hidden md:flex gap-2 overflow-x-auto p-1">
              <button
                onClick={() => setSelectedModality("ALL")}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-full border transition-all shadow-sm",
                  selectedModality === "ALL"
                    ? "bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-200"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                )}
              >ALL</button>
              {modalities.map(m => {
                const colors = getModalityColors(m);
                const isActive = selectedModality === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedModality(m)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-bold rounded-full border transition-all shadow-sm",
                      isActive
                        ? cn("text-white ring-2 ring-white shadow-md", colors.border.replace('border-', 'bg-'), colors.border)
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleNav('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(dayjs())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleNav('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={() => { setEditing(null); setPrefillData(null); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 font-semibold rounded-full px-6 transition-transform active:scale-95">
            + Book
          </Button>
        </div>
      </header>

      {/* --- BODY --- */}
      <div className="flex-1 overflow-hidden flex flex-col relative w-full bg-slate-50/50">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* VIEW: CONTROL TOWER DAY */}
        {viewMode === 'day' && (
          <div className="flex flex-col h-full w-full">
            {/* Modality Columns Header */}
            <div className="grid border-b bg-white shrink-0 shadow-sm z-10" style={{ gridTemplateColumns: `70px repeat(${modalities.length}, 1fr)` }}>
              <div className="border-r bg-slate-50/80 p-3 text-center text-xs font-bold text-slate-400 flex items-center justify-center backdrop-blur-sm">Time</div>
              {modalities.map(m => {
                const colors = getModalityColors(m);
                return (
                  <div key={m} className={cn("p-3 text-center border-r last:border-r-0 relative overflow-hidden", colors.bg)}>
                    <div className={cn("absolute inset-0 opacity-20", colors.bg)}></div>
                    <div className={cn("relative z-10 text-sm font-black tracking-tight", colors.text)}>{m}</div>
                    <div className={cn("relative z-10 text-[10px] uppercase tracking-wider font-semibold opacity-70", colors.text)}>Scanner 01</div>
                  </div>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto relative bg-white">
              <div className="grid min-h-[800px]" style={{ gridTemplateColumns: `70px repeat(${modalities.length}, 1fr)` }}>
                {/* Time Axis */}
                <div className="border-r bg-slate-50 text-right text-xs text-slate-400 font-medium">
                  {HOURS.map(hour => (
                    <div key={hour} className="h-32 pr-2 pt-2 border-b border-slate-100 relative -top-0 text-[10px]">
                      {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                    </div>
                  ))}
                </div>

                {/* Modality Columns */}
                {modalities.map(modality => (
                  <div key={modality} className="border-r last:border-r-0 relative bg-white">
                    {HOURS.map(hour => {
                      // Filter for this column + this time
                      const slotAppts = filteredAppointments.filter(a =>
                        a?.modality === modality &&
                        dayjs(a?.scheduled_start).isSame(currentDate, 'day') &&
                        dayjs(a?.scheduled_start).hour() === hour
                      );

                      return (
                        <div
                          key={hour}
                          className={cn(
                            "h-32 border-b border-slate-100 hover:bg-slate-50/50 transition-colors group relative border-dashed border-slate-100/50",
                            // Hover effect using modality color
                            // "hover:bg-opacity-10",
                            // getModalityColors(modality).bg.replace('bg-', 'hover:bg-') // Simplified approach
                          )}
                          onClick={() => handleSlotClick(currentDate, hour, modality)}
                        >
                          <div className="hidden group-hover:flex items-center justify-center h-full opacity-60">
                            <span className="text-[10px] text-indigo-400 font-medium">+ Add {modality}</span>
                          </div>
                          <div className="absolute inset-x-1 inset-y-1 flex flex-col gap-1 pointer-events-none">
                            {slotAppts.map(a => renderEvent(a))}
                          </div>
                        </div>
                      )
                    })}
                    {/* Current Time Line */}
                    {currentDate.isSame(dayjs(), 'day') && (
                      <div
                        className="absolute w-full h-0.5 bg-red-400/50 z-10 pointer-events-none"
                        style={{ top: calculateTopOffset(8) }} // passing startHour 8
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: WEEK */}
        {viewMode === 'week' && (
          <div className="flex flex-col h-full w-full">
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b bg-white shrink-0">
              <div className="border-r bg-slate-50"></div>
              {displayedDays.map(day => (
                <div key={day.toString()} className={cn("text-center py-3 border-r", day.isSame(dayjs(), 'day') && "bg-blue-50/10")}>
                  <div className={cn("text-xs font-bold uppercase tracking-wider", day.isSame(dayjs(), 'day') ? "text-blue-600" : "text-slate-400")}>{day.format("ddd")}</div>
                  <div className={cn("text-xl font-light", day.isSame(dayjs(), 'day') ? "text-blue-600" : "text-slate-700")}>{day.format("D")}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto relative bg-white w-full">
              <div className="grid grid-cols-[60px_repeat(6,1fr)] min-h-[800px]">
                <div className="border-r bg-slate-50 text-right text-xs text-slate-400 font-medium">
                  {HOURS.map(hour => (
                    <div key={hour} className="h-24 pr-2 pt-1 border-b border-slate-100 relative -top-3">
                      {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                    </div>
                  ))}
                </div>
                {displayedDays.map(day => (
                  <div key={day.toString()} className="border-r relative">
                    {HOURS.map(hour => {
                      const appts = getAppointmentsForSlot(thisDayAppointments(day, filteredAppointments), day, hour);
                      return (
                        <div
                          key={hour}
                          className="h-24 border-b border-slate-100/50 hover:bg-slate-50 transition-colors group relative"
                          onClick={() => handleSlotClick(day, hour)}
                        >
                          <div className="absolute inset-1 flex flex-col gap-1 pointer-events-none w-full">
                            {appts.map(a => renderEvent(a))}
                          </div>
                        </div>
                      )
                    })}
                    {day.isSame(dayjs(), 'day') && (
                      <div
                        className="absolute w-full h-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{ top: calculateTopOffset(8) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: MONTH (Simplified) */}
        {viewMode === 'month' && (
          <div className="flex-1 grid grid-cols-7 h-full overflow-y-auto w-full">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-slate-400 border-b bg-slate-50">{d}</div>
            ))}
            {displayedDays.map(day => {
              const isCurrMonth = day.isSame(currentDate, 'month');
              const dayAppts = filteredAppointments.filter(a => dayjs(a?.scheduled_start).isSame(day, 'day'));

              return (
                <div key={day.toString()} className={cn("min-h-[120px] border-b border-r p-2 transition-colors hover:bg-slate-50/50", !isCurrMonth && "bg-slate-50/30")}>
                  <div className={cn("text-xs font-semibold mb-2", day.isSame(dayjs(), 'day') ? "text-white bg-indigo-600 inline-flex w-6 h-6 items-center justify-center rounded-full" : "text-slate-500")}>
                    {day.format("D")}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayAppts.slice(0, 4).map(a => renderEvent(a, true))}
                    {dayAppts.length > 4 && <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayAppts.length - 4} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* VIEW: LIST (Standard Table) */}
        {viewMode === 'list' && (
          <div className="flex-1 overflow-auto bg-slate-50/30 p-6">
            <div className="bg-white border rounded-lg shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Modality</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAppointments.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No appointments found matches.</td></tr>
                  )}
                  {filteredAppointments.map(a => (
                    <tr key={a?.id || Math.random()} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {dayjs(a.scheduled_start).format("MMM D, HH:mm")}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {a.patient_name} <span className="text-slate-400 font-normal text-xs ml-1">({a.accession_number})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border shadow-sm", getModalityColors(a.modality).bg, getModalityColors(a.modality).text, getModalityColors(a.modality).border)}>
                          {a.modality}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border", getStatusColor(a.status))}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setShowModal(true); }}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {editing ? <Clock className="w-5 h-5 text-indigo-500" /> : <CalendarIcon className="w-5 h-5 text-indigo-500" />}
                {editing ? "Edit Appointment" : "New Booking"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AppointmentScheduler
                prefill={editing || (prefillData ? {
                  scheduled_start: prefillData.start,
                  modality: prefillData.modality
                } : undefined)}
                onSaved={async () => {
                  setShowModal(false);
                  setEditing(null);
                  setPrefillData(null);
                  await loadAppointments();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Logic Helpers
function thisDayAppointments(day: dayjs.Dayjs, all: Appointment[]) {
  return all.filter(a => dayjs(a?.scheduled_start).isSame(day, 'day'));
}

function getAppointmentsForSlot(dayAppts: Appointment[], day: dayjs.Dayjs, hour: number) {
  return dayAppts.filter(a => dayjs(a?.scheduled_start).hour() === hour);
}

function calculateTopOffset(startHour: number) {
  const now = dayjs();
  const hour = now.hour();
  const min = now.minute();
  if (hour < startHour || hour > 20) return '0%';
  // (hour - startHour) * 128 + (min/60)*128
  const px = (hour - startHour) * 128 + (min / 60) * 128;
  return `${px}px`;
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'COMPLETED': return 'border-emerald-500 bg-emerald-50/80 text-emerald-900';
    case 'CANCELLED': return 'border-red-400 bg-red-50/50 text-red-900 opacity-60 dashed';
    case 'IN_PROGRESS': return 'border-amber-400 bg-amber-50/80 text-amber-900';
    default: return 'border-indigo-500 bg-indigo-50/80 text-indigo-900';
  }
}
