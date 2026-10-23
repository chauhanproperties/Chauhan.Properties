import { createEnquiryForm, setupSharedUi } from "./ui.js";

setupSharedUi();
document.querySelector(".contact-card")?.replaceWith(createEnquiryForm());
