// src/layout/Layout.tsx
import TopNav from "./TopNav";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      {/* SINGLE TOP NAVIGATION */}
      <TopNav />

      {/* PAGE CONTENT */}
      <main className="pt-[64px] min-h-screen bg-gray-50 flex flex-col w-full max-w-none">
        <div className="w-full flex-1">
          <Outlet />
        </div>
      </main>
    </>
  );
}

