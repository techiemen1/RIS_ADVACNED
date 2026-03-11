// src/services/authService.ts
//
// Auth service — Rev 2
// Access token: stored in localStorage, sent as Bearer header (unchanged)
// Refresh token: httpOnly cookie managed by browser + backend (automatic)

import axiosInstance from "./axiosInstance";

export interface User {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  profile_picture?: string | null;
  role_id?: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Login user via backend.
 * Backend sets the httpOnly refresh_token cookie automatically.
 * We store only the access token (15 min) in localStorage.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const res = await axiosInstance.post("/auth/login", { username, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    return { token, user };
  } catch (err: any) {
    console.error("[AUTH] Login error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error || "Login failed");
  }
}

/**
 * Logout — calls the backend to revoke the refresh token session and
 * clear the httpOnly cookie.  Then clears localStorage.
 *
 * IMPORTANT: Always call this rather than clearing localStorage directly
 * so the refresh token is revoked server-side.
 */
export async function logout(): Promise<void> {
  try {
    // Backend reads the httpOnly cookie, marks it revoked, clears cookie
    await axiosInstance.post("/auth/logout");
  } catch (err) {
    // Best-effort — if backend is unreachable, still clear local state
    console.warn("[AUTH] Backend logout failed (clearing local session anyway):", err);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

/**
 * Get the currently logged-in user from localStorage.
 */
export function getUser(): User | null {
  const stored = localStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
}

/**
 * Fetch profile from /auth/profile and update localStorage.
 */
export async function fetchProfile(): Promise<User> {
  try {
    const res = await axiosInstance.get("/auth/profile");
    const user: User = res.data;
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (err: any) {
    console.error("[AUTH] Fetch profile error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error || "Failed to fetch profile");
  }
}

/**
 * Revoke all sessions for the current user (e.g. after password change).
 */
export async function revokeAllSessions(): Promise<void> {
  await axiosInstance.post("/auth/revoke-all");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
