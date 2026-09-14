import axios from "axios";

export const BACKEND_URL = "";
export const API = "/api";
const api = axios.create({ baseURL: API, withCredentials: true });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default api;

export function formatINR(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
export function formatApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) return err instanceof Error ? err.message : "Something went wrong";
  const d = err.response?.data?.detail;
  if (!d) return err.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(" ");
  return JSON.stringify(d);
}
function relative(path: string): string {
  if (!path.startsWith("/api/")) throw new Error("API helpers require a relative /api/ path");
  return path.slice(4);
}
export async function apiGet<T>(path: string): Promise<T> { return (await api.get<T>(relative(path))).data; }
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return (await api.post<T>(relative(path), body, { headers: { "X-Checkout-Intent": "pickup" } })).data;
}
export async function apiPatch<T>(path: string, body: unknown): Promise<T> { return (await api.patch<T>(relative(path), body)).data; }