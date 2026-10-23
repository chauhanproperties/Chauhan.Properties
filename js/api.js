import { API_BASE_URL, API_CONFIGURED } from "./config.js";
import { PAGE_SIZE } from "./config.js";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

function readableError(detail, fallback) {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map(item => {
      const message = typeof item === "string" ? item : item?.msg || item?.message;
      if (typeof message !== "string" || !message.trim()) return null;
      const location = Array.isArray(item?.loc) ? item.loc.filter(part => part !== "body").join(" ") : "";
      return location ? `Please check ${location}: ${message}` : message;
    }).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return fallback;
}

export async function api(path, options = {}) {
  if (!API_CONFIGURED) throw new ApiError("The website API address is not configured yet.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const waking = setTimeout(() => window.dispatchEvent(new CustomEvent("api:waking")), 5000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
      signal: controller.signal,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(readableError(payload?.detail, "The request could not be completed. Please try again."), response.status);
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === "AbortError") throw new ApiError("The server took too long to respond. Please try again.");
    if (error instanceof TypeError) throw new ApiError("We could not reach the server. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
    clearTimeout(waking);
  }
}

function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const propertyApi = {
  list: params => api(`/api/public/properties?${queryString(params)}`),
  get: id => api(`/api/public/properties/${encodeURIComponent(id)}`),
};

export const enquiryApi = {
  submit: data => api("/api/public/queries", { method: "POST", body: JSON.stringify(data) }),
};

export async function listPropertiesWithArea(params, minArea, maxArea) {
  const pageSize = 100;
  const rows = new Map();
  let page = 1;
  let total = 0;
  let totalPages = 1;
  do {
    const result = await propertyApi.list({ ...params, page, page_size: pageSize });
    for (const item of result.items) rows.set(item.id, item);
    total = result.total;
    totalPages = Math.ceil(total / pageSize);
    page += 1;
  } while (page <= totalPages);

  const filtered = [...rows.values()].filter(item => {
    const area = Number(item.area);
    return Number.isFinite(area) && (minArea === "" || area >= Number(minArea)) && (maxArea === "" || area <= Number(maxArea));
  });
  const comparators = {
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    price_asc: (a, b) => Number(a.price) - Number(b.price),
    price_desc: (a, b) => Number(b.price) - Number(a.price),
  };
  filtered.sort(comparators[params.sort] || comparators.newest);
  const currentPage = Number(params.page) || 1;
  return {
    items: filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    page: currentPage,
    page_size: PAGE_SIZE,
    total: filtered.length,
  };
}
