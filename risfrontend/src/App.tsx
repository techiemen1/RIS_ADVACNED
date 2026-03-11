import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "./layout/Loader";
import Layout from "./layout/Layout";
import Login from "./pages/Auth/Login";
import { RoleProvider } from "./context/RoleContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";

/* ---------- Lazy Pages ---------- */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AppointmentsPage = lazy(() => import("./pages/Appointments/AppointmentsPage"));
const PACSPage = lazy(() => import("./pages/PACSPage"));
const Reports = lazy(() => import("./pages/Reports/ReportList"));
const AddReport = lazy(() => import("./pages/Reports/AddReport"));
const ReportViewer = lazy(() => import("./pages/Reports/ReportViewer"));
const Billing = lazy(() => import("./pages/Billing/BillingPage"));
const Inventory = lazy(() => import("./pages/Inventory/InventoryPage"));
const MWLPage = lazy(() => import("./pages/MWL/MWLPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/Users/ProfilePage"));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const OrderManagement = lazy(() => import("./pages/Orders/OrderManagement"));
const PatientManagement = lazy(() => import("./pages/Patients/PatientManagement"));
const ReportEditor = lazy(() => import("./pages/ReportEditor"));
const PortalLanding = lazy(() => import("./pages/Patient/PortalLanding"));
const ReferralDashboard = lazy(() => import("./pages/Referrals/ReferralDashboard"));

export default function App() {
  return (
    <RoleProvider>
      <Toaster position="top-right" />

      {/* ✅ SINGLE SUSPENSE */}
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* -------- PUBLIC -------- */}
          <Route path="/login" element={<Login />} />
          <Route path="/view/:token" element={<PortalLanding />} />

          {/* -------- PROTECTED LAYOUT -------- */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<PatientManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/schedule" element={<AppointmentsPage />} />
            <Route path="/pacs" element={<PACSPage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/add" element={<AddReport />} />
            <Route path="/reports/view/:id" element={<ReportViewer />} />
            <Route path="/report/:studyId" element={<ReportEditor />} />
            <Route path="/report/edit/:studyId" element={<ReportEditor />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/mwl" element={<MWLPage />} />
            <Route path="/referrals" element={<ReferralDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RoleProvider>
  );
}

