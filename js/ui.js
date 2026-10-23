import { API_CONFIGURED } from "./config.js";

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value ?? "";
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

export const money = value => value == null ? "Price on request" : new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(value);

export function showNotice(message, kind = "info") {
  const host = document.querySelector("#api-notice");
  if (!host) return;
  host.className = `notice ${kind}`;
  host.textContent = message;
  host.hidden = false;
}

export function clearNotice() {
  const host = document.querySelector("#api-notice");
  if (host) host.hidden = true;
}

export function setupSharedUi() {
  document.querySelectorAll("[data-year]").forEach(node => { node.textContent = String(new Date().getFullYear()); });
  if (!API_CONFIGURED) showNotice("The website API address needs to be configured before deployment.", "error");
  window.addEventListener("api:waking", () => showNotice("The server is waking up after being idle. This can take up to a minute; your request is still in progress."));
}

export function showLoadError(container, message, retry) {
  const card = el("section", { class: "empty-state" });
  card.append(el("span", { class: "empty-icon", text: "⌂" }), el("h2", { text: "We couldn’t load this just now." }), el("p", { text: message }));
  if (retry) card.append(el("button", { class: "button button-dark", type: "button", text: "Try again", onclick: retry }));
  container.replaceChildren(card);
}

export function createEnquiryForm({ propertyId = null, compact = false } = {}) {
  const section = el("section", { class: compact ? "contact-card enquiry-card" : "contact-card" });
  const heading = el("div", { class: "contact-card-heading" });
  heading.append(el("p", { class: "eyebrow", text: "SEND AN ENQUIRY" }), el("h2", { text: propertyId ? "Ask about this property." : "How can we help?" }), el("p", { text: "Fields marked * are required." }));
  const feedback = el("div", { class: "form-message", role: "status" });
  feedback.hidden = true;
  const form = el("form", { class: "enquiry-form" });
  const name = el("input", { name: "name", autocomplete: "name", maxlength: "200", required: "required", placeholder: "e.g. Aditi Sharma" });
  const phone = el("input", { name: "phone", type: "tel", autocomplete: "tel", minlength: "7", maxlength: "24", required: "required", placeholder: "Your phone number" });
  const email = el("input", { name: "email", type: "email", autocomplete: "email", maxlength: "254", placeholder: "you@example.com" });
  const samePhone = el("input", { id: `same-phone-${propertyId || "general"}`, type: "checkbox", checked: "checked" });
  const sameLabel = el("label", { class: "same-phone", for: samePhone.id });
  sameLabel.append(samePhone, el("span", { text: "Use the same number for WhatsApp" }));
  const whatsapp = el("input", { name: "whatsapp_number", type: "tel", autocomplete: "tel", minlength: "7", maxlength: "24", placeholder: "WhatsApp number" });
  const whatsappWrap = field("WhatsApp number", whatsapp, true);
  whatsappWrap.hidden = true;
  const message = el("textarea", { name: "message", rows: "5", maxlength: "5000", placeholder: "Tell us about a property or what you have in mind." });
  const submit = el("button", { class: "button button-dark submit-button", type: "submit" });
  submit.append(document.createTextNode("Send enquiry "), el("span", { text: "→", "aria-hidden": "true" }));
  const privacy = el("p", { class: "privacy-note", text: "Your details are used to respond to this enquiry. Phone numbers are not verified." });

  form.append(field("Your name", name, true), row(field("Phone number", phone, true), field("Email", email, false, "optional")), sameLabel, whatsappWrap,
    field("What would you like to know?", message, false, "optional"), submit, privacy);
  section.append(heading, feedback, form);

  samePhone.addEventListener("change", () => {
    whatsappWrap.hidden = samePhone.checked;
    whatsapp.required = !samePhone.checked;
    if (samePhone.checked) whatsapp.value = "";
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    feedback.hidden = true;
    try {
      const { enquiryApi } = await import("./api.js?v=2");
      await enquiryApi.submit({
        name: name.value.trim(),
        phone: phone.value.trim(),
        whatsapp_number: samePhone.checked ? phone.value.trim() : whatsapp.value.trim(),
        email: email.value.trim() || null,
        message: message.value.trim() || null,
        property_id: propertyId,
      });
      feedback.className = "form-message success";
      feedback.textContent = "Thank you. Your enquiry has been received. We’ll be in touch.";
      feedback.hidden = false;
      form.reset();
      samePhone.checked = true;
      whatsappWrap.hidden = true;
      whatsapp.required = false;
    } catch (error) {
      feedback.className = "form-message error";
      feedback.textContent = error.message || "We couldn’t send your enquiry. Please try again.";
      feedback.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
  return section;
}

function field(label, input, required, hint = "") {
  const wrap = el("label", { class: "form-field" });
  const labelNode = el("span", {}, [label]);
  if (required) labelNode.append(el("b", { text: "*" }));
  if (hint) labelNode.append(el("small", { text: hint }));
  wrap.append(labelNode, input);
  return wrap;
}

function row(...children) { return el("div", { class: "form-row" }, children); }
