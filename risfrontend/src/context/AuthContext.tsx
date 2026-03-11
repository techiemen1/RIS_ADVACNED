import { createContext, useState, useEffect, ReactNode } from "react";
import { getUserProfile } from "../services/authService";

interface AuthContextProps {
  user: any;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const profile = await getUserProfile();
      setUser(profile);
    } catch (error: any) {
      console.warn("⚠️ Failed to fetch profile:", error.message);

      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Attempt refresh
          const response = await fetch(`/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              console.log("✅ Token refreshed successfully");
              login(data.token);
              // fetchUser will be called again by login() but to be safe/avoid loop we can just set profile if getUserProfile works now
              // But login() sets token and calls fetchUser, so we should be good.
              // However, login implementation calls fetchUser.
              return;
            }
          }
        } catch (refreshErr) {
          console.error("❌ Refresh failed:", refreshErr);
        }
      }

      // If we reach here, refresh failed or no token
      logout();
    }
  };

  const login = (token: string) => {
    localStorage.setItem("token", token);
    fetchUser();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { };
