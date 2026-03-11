// src/context/RoleContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

type Role = "admin" | "doctor" | "radiologist" | "technician" | "staff" | "billing";
interface User {
  username: string;
  role: Role;
}

interface RoleContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <RoleContext.Provider value={{ user, setUser, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRBAC = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRBAC must be used within RoleProvider");
  return context;
};
