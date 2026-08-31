// API Client for NestJS Backend with Automatic 401 Token Refresh

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000/api/v1";

export const TOKEN_STORAGE_KEY = "dashboard_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "dashboard_refresh_token";
export const USER_STORAGE_KEY = "dashboard_user_profile";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (err: any) => void
) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: any) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth = false, headers = {}, ...restOptions } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const token = getStoredToken();
  const reqHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (token && !skipAuth && !reqHeaders.Authorization && !reqHeaders.authorization) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (
    restOptions.body &&
    !(restOptions.body instanceof FormData) &&
    !reqHeaders["Content-Type"] &&
    !reqHeaders["content-type"]
  ) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: reqHeaders,
  });

  // Handle 401 Unauthorized -> Attempt Silent Refresh
  if (response.status === 401 && !skipAuth && !endpoint.includes("auth/refresh-token") && !endpoint.includes("auth/dashboard/login")) {
    const refreshToken = getStoredRefreshToken();

    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshUrl = `${API_BASE_URL}/auth/refresh-token`;
          const refreshRes = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData?.data?.accessToken || refreshData?.accessToken;
          const newRefreshToken = refreshData?.data?.refreshToken || refreshData?.refreshToken;

          if (newAccessToken) {
            setStoredTokens(newAccessToken, newRefreshToken);
            onRefreshed(newAccessToken);
            isRefreshing = false;

            reqHeaders.Authorization = `Bearer ${newAccessToken}`;
            const retryRes = await fetch(url, { ...restOptions, headers: reqHeaders });
            const retryIsJson = retryRes.headers.get("content-type")?.includes("application/json");
            const retryBody = retryIsJson ? await retryRes.json() : await retryRes.text();

            if (retryRes.ok) {
              if (retryBody && typeof retryBody === "object" && "data" in retryBody && "success" in retryBody) {
                return retryBody.data as T;
              }
              return retryBody as T;
            }
          } else {
            isRefreshing = false;
            const err = new ApiError("Failed to refresh token", 401, refreshData);
            onRefreshFailed(err);
            removeStoredToken();
          }
        } catch (refreshErr) {
          isRefreshing = false;
          onRefreshFailed(refreshErr);
          removeStoredToken();
        }
      } else {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(
            async (newToken) => {
              try {
                reqHeaders.Authorization = `Bearer ${newToken}`;
                const retryRes = await fetch(url, { ...restOptions, headers: reqHeaders });
                const retryIsJson = retryRes.headers.get("content-type")?.includes("application/json");
                const retryBody = retryIsJson ? await retryRes.json() : await retryRes.text();
                if (retryRes.ok) {
                  if (retryBody && typeof retryBody === "object" && "data" in retryBody && "success" in retryBody) {
                    resolve(retryBody.data as T);
                  } else {
                    resolve(retryBody as T);
                  }
                } else {
                  reject(new ApiError("Retry failed", retryRes.status, retryBody));
                }
              } catch (e) {
                reject(e);
              }
            },
            (err) => {
              reject(err);
            }
          );
        });
      }
    }
  }


  let responseBody: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    if (typeof responseBody === "object" && responseBody !== null) {
      if (Array.isArray(responseBody.message)) {
        errorMsg = responseBody.message.join(", ");
      } else if (responseBody.message) {
        errorMsg = responseBody.message;
      } else if (responseBody.error) {
        errorMsg = responseBody.error;
      }
    } else if (typeof responseBody === "string" && responseBody) {
      errorMsg = responseBody;
    }
    throw new ApiError(errorMsg, response.status, responseBody);
  }

  // If backend uses ResponseInterceptor: { success: true, statusCode: 200, message: 'done', data: ... }
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "data" in responseBody &&
    "success" in responseBody
  ) {
    return responseBody.data as T;
  }

  return responseBody as T;
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, { method: "GET", params, headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, { method: "DELETE", headers }),
};

export default api;
