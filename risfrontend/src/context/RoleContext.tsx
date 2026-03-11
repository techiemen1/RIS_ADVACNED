import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "../services/axiosInstance"; // IMPORTANT: use your axiosInstance

interface User {
  id?: number;
  username: string;
  role: string;
  full_name?: string;
  email?: string;
}

interface RoleContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /* -------------------------------------------------------
     AUTO-LOGIN on refresh using /auth/me
  -------------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    const restoreSession = async () => {
      try {
        const res = await axios.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.user) {
          setUserState(res.data.user);
          setIsAuthenticated(true);
          localStorage.setItem("user", JSON.stringify(res.data.user));

          console.log("[RBAC] 🔄 Session restored:", res.data.user.username);
        }
      } catch (err) {
        console.error("[RBAC] ❌ Auto-login failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUserState(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /* -------------------------------------------------------
     MANUAL LOGIN SET USER 
  -------------------------------------------------------- */
  const setUser = (user: User | null) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      setUserState(user);
      setIsAuthenticated(true);
      console.log("[RBAC] 👤 User set:", user.username);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUserState(null);
      setIsAuthenticated(false);
    }
  };

  /* -------------------------------------------------------
     LOGOUT
  -------------------------------------------------------- */
  const logout = () => {
    console.log("[RBAC] 🚪 Logging out:", user?.username);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserState(null);
    setIsAuthenticated(false);
  };

  return (
    <RoleContext.Provider value={{ user, setUser, logout, isAuthenticated, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
};

/* -------------------------------------------------------
   SAFE HOOK
-------------------------------------------------------- */
export const useRBAC = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    console.warn("useRBAC called outside RoleProvider");
    return {
      user: null,
      setUser: () => { },
      logout: () => { },
      isAuthenticated: false,
      isLoading: false,
    };
  }
  return context;
};

export { RoleContext };

