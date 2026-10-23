import { listPropertiesWithArea, propertyApi } from "./api.js?v=2";
import { PAGE_SIZE } from "./config.js";
import { clearNotice, el, money, setupSharedUi, showLoadError, showNotice } from "./ui.js";

setupSharedUi();
const form = document.querySelector("#filters");
const grid = document.querySelector("#property-grid");
const count = document.querySelector("#results-count");
const pagination = document.querySelector("#pagination");
let page = 1;
let loadSequence = 0;

form.addEventListener("submit", event => { event.preventDefault(); page = 1; load(); });
form.addEventListener("reset", () => { setTimeout(() => { page = 1; load(); }, 0); });
load();

async function load() {
  const sequence = ++loadSequence;
  const filters = Object.fromEntries(new FormData(form));
  const minPrice = filters.min_price === "" ? null : Number(filters.min_price);
  const maxPrice = filters.max_price === "" ? null : Number(filters.max_price);
  const minArea = filters.min_area;
  const maxArea = filters.max_area;
  if ((minPrice !== null && minPrice < 0) || (maxPrice !== null && maxPrice < 0) || (minArea && Number(minArea) < 0) || (maxArea && Number(maxArea) < 0)) {
    showNotice("Enter zero or a positive amount for price and area filters.", "error");
    return;
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    showNotice("Minimum price must not be greater than maximum price.", "error");
    return;
  }
  if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
    showNotice("Minimum area must not be greater than maximum area.", "error");
    return;
  }
  clearNotice();
  grid.replaceChildren(el("div", { class: "loading-card" }, [el("span", { class: "spinner" }), el("span", { text: minArea || maxArea ? "Finding matching properties…" : "Finding properties…" })]));
  count.textContent = "";
  pagination.replaceChildren();
  const params = { property_type: filters.property_type, min_price: filters.min_price, max_price: filters.max_price, sort: filters.sort };
  try {
    const result = minArea || maxArea
      ? await listPropertiesWithArea({ ...params, page }, minArea, maxArea)
      : await propertyApi.list({ ...params, page, page_size: PAGE_SIZE });
    if (sequence !== loadSequence) return;
    renderResults(result);
  } catch (error) {
    if (sequence !== loadSequence) return;
    showLoadError(grid, error.message || "Please check your connection and try again.", load);
  }
}

function renderResults(result) {
  count.textContent = `${result.total} ${result.total === 1 ? "property" : "properties"} found`;
  if (!result.items.length) {
    grid.replaceChildren(el("div", { class: "empty-state" }, [el("span", { class: "empty-icon", text: "⌂" }), el("h2", { text: "No places match those filters." }), el("p", { text: "Try widening your price or area range, or clear the filters to see every listing." }), el("button", { class: "button button-dark", type: "button", text: "Clear filters", onclick: () => form.reset() })]));
    return;
  }
  grid.replaceChildren(...result.items.map(propertyCard));
  if (result.total > result.page_size) {
    const previous = el("button", { type: "button", class: "page-button", text: "← Previous" });
    previous.disabled = result.page <= 1;
    previous.addEventListener("click", () => { page -= 1; load(); window.scrollTo({ top: document.querySelector("#listings").offsetTop, behavior: "smooth" }); });
    const next = el("button", { type: "button", class: "page-button", text: "Next →" });
    next.disabled = result.page * result.page_size >= result.total;
    next.addEventListener("click", () => { page += 1; load(); window.scrollTo({ top: document.querySelector("#listings").offsetTop, behavior: "smooth" }); });
    pagination.append(previous, el("span", { class: "page-count", text: `Page ${result.page} of ${Math.ceil(result.total / result.page_size)}` }), next);
  }
}

function propertyCard(item) {
  const link = el("a", { class: "property-card", href: `property.html?id=${encodeURIComponent(item.id)}` });
  const photo = el("div", { class: "property-photo" });
  const image = item.images?.[0]?.image_url ? el("img", { src: item.images[0].image_url, alt: item.title, loading: "lazy" }) : null;
  if (image) {
    image.addEventListener("error", () => { image.remove(); photo.classList.add("photo-unavailable"); }, { once: true });
    photo.append(image);
  } else photo.classList.add("photo-unavailable");
  photo.append(el("span", { class: `status-pill ${item.status === "sold" ? "sold" : "available"}`, text: item.status === "sold" ? "Sold" : "Available" }));
  photo.append(el("span", { class: "photo-arrow", text: "↗", "aria-hidden": "true" }));
  const body = el("div", { class: "property-card-body" });
  body.append(el("p", { class: "property-type", text: labelType(item.property_type) }), el("h3", { text: item.title }), el("p", { class: "property-address", text: item.address }));
  const facts = el("div", { class: "property-facts" });
  facts.append(el("span", {}, [el("b", { text: formatArea(item.area) }), el("small", { text: "sq ft" })]));
  const details = item.building_details;
  if (details) facts.append(el("span", {}, [el("b", { text: String(details.bedrooms) }), el("small", { text: details.bedrooms === 1 ? "bed" : "beds" })]));
  body.append(facts, el("div", { class: "property-price-row" }, [el("span", { class: "property-price", text: money(item.price) }), el("span", { class: "text-link", text: "View home →" })]));
  link.append(photo, body);
  return link;
}

function labelType(value) { return ({ plot: "Land · Plot", house: "Residential · House", flat: "Residential · Flat" })[value] || "Property"; }
function formatArea(value) { return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
