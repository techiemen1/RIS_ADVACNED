import React, { useState, useMemo } from 'react';
import { Menu, LayoutDashboard, Clock, Image, FileText, DollarSign, Package, Settings, LogOut, ChevronDown } from 'lucide-react';
// Firebase related imports are commented out to maintain the mock state, 
// but would be enabled for persistent storage in a real application.
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// import { getFirestore, doc, getDoc, addDoc, onSnapshot, collection, query, where } from 'firebase/firestore';


// --- Utility Components (Simplified Stand-ins and Mocks) ---

/**
 * Mock Authentication hook for Role-Based Access Control (RBAC).
 * Handles mock user state and login/logout functions.
 */
const useRBAC = () => {
  const [user, setUser] = useState({ id: 'user_123', username: 'jsmith', role: 'Radiologist', isAuthenticated: true });

  const login = () => setUser({ id: 'user_123', username: 'jsmith', role: 'Radiologist', isAuthenticated: true });
  const logout = () => setUser(null);

  return { 
    user, 
    role: user ? user.role : null, // Expose role for ProtectedRoute
    isLoading: false,
    login,
    logout
  };
};

// Mock Toaster function for notifications
const Toaster = () => (
  <div className="fixed top-4 right-4 z-50 p-3 bg-blue-500 text-white rounded-lg shadow-xl">
    System notifications here.
  </div>
);

// Loader component displayed during page transitions or data loading
const Loader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    <p className="ml-3 text-lg text-gray-600">Loading Module...</p>
  </div>
);

/**
 * ProtectedRoute: Checks authentication state. If not authenticated, displays the Login page.
 */
const ProtectedRoute = ({ children, setPage }) => {
  const { user, login } = useRBAC();
  
  if (user && user.isAuthenticated) {
    return children;
  }
  
  return <Login setPage={setPage} login={login} />;
};

/**
 * Mock Login Page: Provides a simple button to simulate login.
 */
const Login = ({ setPage, login }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-200">
    <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-sm">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">IPACX RIS Login</h2>
      <button 
        onClick={() => { login(); setPage('dashboard'); }} 
        className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
      >
        Sign In (Demo as Radiologist)
      </button>
    </div>
  </div>
);


// --- Navigation Data (Used for page state mapping) ---
const NAV_ITEMS = [
  { path: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { path: 'pacs', name: 'PACS Viewer', icon: Image },
  { path: 'reports', name: 'Reports', icon: FileText },
  { path: 'appointments', name: 'Appointments', icon: Clock },
  { path: 'mwl', name: 'Modality Worklist', icon: Menu },
  { path: 'billing', name: 'Billing', icon: DollarSign },
  { path: 'inventory', name: 'Inventory', icon: Package },
  { path: 'settings', name: 'Settings', icon: Settings },
];

// --- Core Components ---

/**
 * Navigation Component (Replaces TopNav.tsx and handles primary application routing/tabs)
 */
const Navigation = ({ currentPage, setPage }) => {
  // Use the mock RBAC hook
  const { user, logout } = useRBAC();
  const [open, setOpen] = useState(false);

  // Checks if a given path matches the current application state
  const isCurrentPage = (path) => currentPage === path;

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-200 border-b shadow-sm px-4 py-2 flex items-center h-[64px]">
      
      {/* TABS LEFT SIDE */}
      <nav className="flex gap-2 overflow-x-auto whitespace-nowrap">
        {NAV_ITEMS.map((t) => (
          <button
            key={t.path}
            onClick={() => setPage(t.path)}
            className={`
              px-4 py-2 rounded-t-lg border-x border-t transition-colors duration-150 text-sm font-medium
              ${isCurrentPage(t.path)
                ? "bg-white border-gray-300 shadow-sm text-blue-700"
                : "bg-gray-100 border-gray-300 hover:bg-gray-50 text-gray-600"}
            `}
          >
            {t.name}
          </button>
        ))}
      </nav>

      {/* USER DROPDOWN RIGHT SIDE */}
      <div className="ml-auto relative">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1 shadow-md hover:bg-blue-700 transition duration-150"
          onClick={() => setOpen(!open)}
        >
          {user.username}
          <ChevronDown size={16} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 bg-white shadow-xl border border-gray-200 rounded-lg w-48 z-50 origin-top-right animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-xs text-gray-600 border-b">
                Signed in as <b>{user.username}</b>
            </div>
            <button
                onClick={() => { setPage('settings'); setOpen(false); }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <Settings size={16} className="inline mr-2" />
                Settings
              </button>
            <button
              onClick={() => { logout(); setPage('login'); setOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t mt-1"
            >
              <LogOut size={16} className="inline mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


/**
 * Layout Component (Replaces src/layout/Layout.tsx - now a simple content wrapper)
 */
const Layout = ({ children }) => {
  // Sets padding-top to compensate for the fixed Navigation bar height (64px + margin)
  return (
    <div className="min-h-screen bg-gray-50 pt-[68px]"> 
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            {children}
        </div>
    </div>
  );
};


// --- Page Components (Dummy) ---
const PageContent = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full min-h-[85vh]">
        <h2 className="text-3xl font-bold mb-4 text-blue-700 border-b pb-2">{title}</h2>
        {children}
    </div>
);

const Dashboard = () => <PageContent title="Dashboard">Welcome, Radiologist. Current worklist count: 42. <p className="mt-4 text-gray-600">This is the main hub for system oversight and critical tasks.</p></PageContent>;
const AppointmentsPage = () => <PageContent title="Appointments">Upcoming patient schedule and booking tool. This is where RIS integration is key.</PageContent>;
const PACSPage = () => <PageContent title="PACS Viewer">DICOM image study browser and viewer interface. Requires complex image loading logic.</PageContent>;
const Reports = () => <PageContent title="Report List">List of all finalized, pending, and preliminary reports. The most critical module.</PageContent>;
const AddReport = () => <PageContent title="Add New Report">Report dictation and template selection module.</PageContent>;
const ReportViewer = () => <PageContent title="View Report">Displaying detailed diagnostic report for study #9876.</PageContent>;
const Billing = () => <PageContent title="Billing">Invoicing and claim management for procedures.</PageContent>;
const Inventory = () => <PageContent title="Inventory">Track contrast media, supplies, and equipment.</PageContent>;
const MWLPage = () => <PageContent title="Modality Worklist (MWL)">Queue of studies ready for image acquisition (HL7/DICOM MWL integration).</PageContent>;
const SettingsPage = () => <PageContent title="System Settings">User management, integrations, and configuration.</PageContent>;


// --- Main Application ---
export default function App() {
  // State management for mock user authentication
  const { user, logout, login } = useRBAC(); 

  // State replaces router: 'dashboard' is the default if logged in, 'login' otherwise
  const [currentPage, setCurrentPage] = useState(user ? 'dashboard' : 'login'); 

  // Memoized function to select the correct page component
  const renderPage = useMemo(() => {
    switch (currentPage) {
      case 'login': return <Login setPage={setCurrentPage} login={login} />;
      case 'dashboard': return <Dashboard />;
      case 'appointments': return <AppointmentsPage />;
      case 'pacs': return <PACSPage />;
      case 'reports': return <Reports />;
      case 'reports/add': return <AddReport />;
      case 'reports/view': return <ReportViewer />;
      case 'billing': return <Billing />;
      case 'inventory': return <Inventory />;
      case 'mwl': return <MWLPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  }, [currentPage, user]);


  // Determine if the full app layout (Nav + Content) should be shown
  const isLoginPage = currentPage === 'login' || !user;

  return (
    <>
      <Toaster />
      
      {/* Navigation is rendered only outside the login state */}
      {!isLoginPage && <Navigation currentPage={currentPage} setPage={setCurrentPage} />}
      
      {isLoginPage ? (
          // Full screen login page (protected by the check within ProtectedRoute)
          <ProtectedRoute setPage={setCurrentPage}>
            {renderPage}
          </ProtectedRoute>
      ) : (
          // Protected content uses the standard Layout wrapper
          <Layout>
              <React.Suspense fallback={<Loader />}>
                  {renderPage}
              </React.Suspense>
          </Layout>
      )}
    </>
  );
}
