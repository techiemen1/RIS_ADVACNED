import { createContext, ReactNode, useState } from "react";

interface NotificationContextProps {
  notify: (type: "success" | "error" | "info", message: string) => void;
}

export const NotificationContext = createContext<NotificationContextProps | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const notify = (type: "success" | "error" | "info", message: string) => {
    // Placeholder for email/SMS/WhatsApp/in-app
    console.log(`[${type}] ${message}`);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
    </NotificationContext.Provider>
  );
};

export {};
