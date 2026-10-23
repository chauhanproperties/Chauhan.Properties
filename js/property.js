import { propertyApi } from "./api.js?v=2";
import { clearNotice, createEnquiryForm, el, money, setupSharedUi, showLoadError } from "./ui.js";

setupSharedUi();
const host = document.querySelector("#property-content");
const id = new URLSearchParams(window.location.search).get("id");
if (!id || !/^\d+$/.test(id)) {
  showLoadError(host, "This property link is missing a valid listing number.", () => { window.location.href = "index.html#listings"; });
} else load();

async function load() {
  try {
    const item = await propertyApi.get(id);
    clearNotice();
    document.title = `${item.title} · Chauhan Properties`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", `${item.title} in ${item.address}. View property details and contact Chauhan Properties.`);
    renderProperty(item);
  } catch (error) {
    showLoadError(host, error.status === 404 ? "This listing may have been removed or is no longer available." : error.message || "Please check your connection and try again.", load);
  }
}

function renderProperty(item) {
  const layout = el("div", { class: "property-detail-layout" });
  const details = el("article", { class: "property-detail" });
  const gallery = createGallery(item);
  const title = el("div", { class: "detail-title-row" });
  const titleCopy = el("div");
  titleCopy.append(el("p", { class: "property-type", text: typeLabel(item.property_type) }), el("h1", { text: item.title }), el("p", { class: "property-address", text: item.address }));
  title.append(titleCopy, el("span", { class: `status-pill detail-status ${item.status === "sold" ? "sold" : "available"}`, text: item.status === "sold" ? "Sold" : "Available" }));
  details.append(gallery, title, el("p", { class: "detail-price", text: money(item.price) }));
  const overview = el("section", { class: "detail-section" });
  overview.append(el("h2", { text: "At a glance" }));
  const facts = el("div", { class: "overview-grid" });
  addFact(facts, "Property type", typeLabel(item.property_type));
  addFact(facts, "Plot size", `${formatNumber(item.length)} × ${formatNumber(item.width)} ft`);
  addFact(facts, "Total plot area", `${formatNumber(item.area)} sq ft`);
  if (item.building_details) {
    addFact(facts, "Bedrooms", item.building_details.bedrooms);
    addFact(facts, "Bathrooms", item.building_details.bathrooms);
    addFact(facts, "Kitchens", item.building_details.kitchens);
    addFact(facts, "Building area", `${formatNumber(item.building_details.building_area)} sq ft`);
    addFact(facts, "Garden area", `${formatNumber(item.building_details.garden_area)} sq ft`);
    addFact(facts, "Parking area", `${formatNumber(item.building_details.parking_area)} sq ft`);
    addFact(facts, "Total built-up area", `${formatNumber(item.building_details.total_area)} sq ft`);
  }
  overview.append(facts);
  details.append(overview);
  if (item.description) {
    const description = el("section", { class: "detail-section" });
    description.append(el("h2", { text: "About this place" }), el("p", { class: "description-copy", text: item.description }));
    details.append(description);
  }
  const mapUrl = getMapUrl(item);
  if (mapUrl) {
    const map = el("section", { class: "detail-section map-section" });
    map.append(el("div", {}, [el("h2", { text: "Explore the location" }), el("p", { class: "muted", text: "Open the location in your maps app." })]), el("a", { href: mapUrl, target: "_blank", rel: "noopener noreferrer", class: "button button-outline", text: "Open map ↗" }));
    details.append(map);
  }
  const enquiry = el("aside", { class: "property-enquiry" });
  enquiry.append(el("div", { class: "enquiry-aside-intro" }, [el("p", { class: "eyebrow", text: "INTERESTED?" }), el("h2", { text: "Let’s talk about this place." }), el("p", { text: "Leave your details and the team can answer your questions." })]), createEnquiryForm({ propertyId: Number(item.id), compact: true }));
  layout.append(details, enquiry);
  host.replaceChildren(layout);
}

function createGallery(item) {
  const images = [...(item.images || [])].sort((a, b) => a.display_order - b.display_order);
  const gallery = el("section", { class: "gallery", "aria-label": "Property photos" });
  const main = el("div", { class: "gallery-main" });
  const mainImage = el("img", { alt: `${item.title} property photo`, loading: "eager" });
  const fallback = el("div", { class: "gallery-placeholder" }, [el("span", { text: "⌂" }), el("p", { text: "Photos for this property are not available." })]);
  const thumbs = el("div", { class: "gallery-thumbnails" });
  function show(index) {
    const image = images[index];
    main.replaceChildren();
    if (!image?.image_url) { main.append(fallback); return; }
    mainImage.src = image.image_url;
    mainImage.alt = `${item.title} photo ${index + 1}`;
    mainImage.onerror = () => main.replaceChildren(fallback);
    main.append(mainImage);
    thumbs.querySelectorAll("button").forEach((button, buttonIndex) => button.classList.toggle("selected", buttonIndex === index));
  }
  images.forEach((image, index) => {
    const button = el("button", { type: "button", class: "gallery-thumb", "aria-label": `Show photo ${index + 1}` });
    const thumb = el("img", { src: image.image_url, alt: "", loading: "lazy" });
    thumb.addEventListener("error", () => button.remove(), { once: true });
    button.append(thumb);
    button.addEventListener("click", () => show(index));
    thumbs.append(button);
  });
  gallery.append(main);
  if (images.length > 1) gallery.append(thumbs);
  show(0);
  return gallery;
}

function addFact(host, label, value) {
  host.append(el("div", { class: "overview-fact" }, [el("span", { text: label }), el("b", { text: String(value) })]));
}
function typeLabel(value) { return ({ plot: "Plot", house: "House", flat: "Flat" })[value] || "Property"; }
function formatNumber(value) { return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function getMapUrl(item) {
  if (item.maps_url) {
    try { const url = new URL(item.maps_url); if (["https:", "http:"].includes(url.protocol)) return url.href; } catch { /* Use coordinates when the saved URL is malformed. */ }
  }
  if (item.latitude != null && item.longitude != null) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.latitude},${item.longitude}`)}`;
  return null;
}
