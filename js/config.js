const PRODUCTION_API_URL = "https://REPLACE-WITH-YOUR-API.example.com";
const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL = isLocalHost ? `${window.location.protocol}//${window.location.hostname}:5000` : PRODUCTION_API_URL;
export const API_CONFIGURED = !API_BASE_URL.includes("REPLACE-WITH-YOUR-API");
export const PAGE_SIZE = 12;
