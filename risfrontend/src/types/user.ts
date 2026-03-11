// src/types/user.ts
export interface User {
  username: string;
  role: "admin" | "doctor" | "radiologist" | "technician";
}
