import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * Central Axios instance for RIS frontend
 *
 * Auth Architecture Rev 2:
 *  • Access token (15 min) — stored in localStorage, sent as Bearer header
 *  • Refresh token (7 days) — httpOnly cookie, browser sends it automatically
 *    to POST /api/auth/refresh
 *
 * withCredentials: true — required for the browser to include the
 *   httpOnly refresh_token cookie on cross-origin requests to the backend.
 */

const VITE_API_URL = import.meta.env.VITE_API_URL || "/api";
console.log(`📡 [Axios] Initialization - BaseURL: ${VITE_API_URL}`);

const axiosInstance = axios.create({
  baseURL:         VITE_API_URL,
  withCredentials: true,   // ← Must be true for httpOnly refresh cookie
  headers: {
    "Cache-Control": "no-cache",
    Pragma:          "no-cache",
    Expires:         "0",
  },
  timeout: 15000,
});

/* ── Request Interceptor ──────────────────────────────────
   Attaches the access token from localStorage to every request.
   The refresh cookie is handled by the browser automatically.
─────────────────────────────────────────────────────────── */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const branchId = localStorage.getItem("adminSelectedBranch");

    config.headers = config.headers || {};
    
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    if (branchId) {
      config.headers["X-Branch-ID"] = branchId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor ─────────────────────────────────
   Handles 401 TOKEN_EXPIRED by silently calling /api/auth/refresh.
   The refresh_token httpOnly cookie is sent automatically by the browser.
   On success: saves the new access token, retries the original request.
   On failure: clears localStorage and redirects to /login.
─────────────────────────────────────────────────────────── */

// Track if a refresh is already in-flight to prevent concurrent refresh storms
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  pendingQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status    = error.response?.status;
    const errorCode = (error.response?.data as any)?.code;

    // ── Silent token refresh ──────────────────────────────
    // Trigger only on 401 with code TOKEN_EXPIRED, not on TOKEN_INVALID
    const shouldRefresh =
      status === 401 &&
      (errorCode === "TOKEN_EXPIRED" || !errorCode) && // handle backends without code
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh"); // prevent refresh loops

    if (shouldRefresh) {
      originalRequest._retry = true;

      // If a refresh is already in-flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        // POST to /api/auth/refresh — NO body; browser sends httpOnly cookie automatically
        const refreshRes = await axios.post(
          "/api/auth/refresh",
          {},                          // empty body — cookie carries the refresh token
          { withCredentials: true }    // ensure cookie is sent even on this bare axios call
        );
        const newToken: string = refreshRes.data.token;

        if (!newToken) throw new Error("No token in refresh response");

        localStorage.setItem("token", newToken);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return axiosInstance(originalRequest);

      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Refresh failed — force re-login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Soft-fail for optional endpoints ──────────────────
    if (status === 404) {
      return Promise.resolve({ data: { success: false } });
    }

    // ── General error logging ─────────────────────────────
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ AXIOS ERROR:", {
        message: error.message,
        code:    error.code,
        url:     error.config?.url,
        status,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
