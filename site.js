const BOOKING_EMAIL = "thedjgelo@gmail.com";
const yearNode = document.getElementById("year");
if (yearNode) yearNode.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion) {
  let ticking = false;
  const updateBackground = () => {
    const y = window.scrollY || 0;
    document.documentElement.style.setProperty("--bg-y", `${-y * 0.055}px`);
    document.documentElement.style.setProperty("--metal-y", `${y * 0.09}px`);
    document.documentElement.style.setProperty("--ghost-y", `${-y * 0.11}px`);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateBackground);
      ticking = true;
    }
  }, { passive: true });
  updateBackground();
}

if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
    document.documentElement.style.setProperty("--my", `${event.clientY}px`);
  }, { passive: true });
}

// Build a shallow stack of silhouettes so the transparent PNG reads like an extruded chrome object.
const logoStage = document.getElementById("logoStage");
const logoDepth = document.getElementById("logoDepth");
const logoFace = document.querySelector(".logo-face");
if (logoDepth) {
  const layers = 15;
  for (let i = 0; i < layers; i += 1) {
    const layer = document.createElement("img");
    layer.src = "/gelo-logo.png";
    layer.alt = "";
    layer.setAttribute("aria-hidden", "true");
    layer.className = "logo-depth-layer";
    const depth = 19 - (i * (38 / (layers - 1)));
    const shade = .54 - (i * .012);
    layer.style.setProperty("--depth", `${depth.toFixed(2)}px`);
    layer.style.setProperty("--shade", shade.toFixed(3));
    logoDepth.appendChild(layer);
  }
}

let logoSpinning = false;
const spinLogo = () => {
  if (!logoStage || reducedMotion || logoSpinning) return;
  logoSpinning = true;
  logoStage.classList.remove("is-spinning");
  void logoStage.offsetWidth;
  logoStage.classList.add("is-spinning");
  window.setTimeout(() => {
    logoStage.classList.remove("is-spinning");
    logoSpinning = false;
  }, 1600);
};

if (logoStage) {
  logoStage.addEventListener("click", spinLogo);
  logoStage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      spinLogo();
    }
  });

  // Auto-spin only once per browser tab/session. Navigating between Home, Mixes and Book will not replay it.
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem("geloIntroSpinSeen") === "1"; } catch (_) {}
  if (!reducedMotion && !alreadySeen) {
    try { sessionStorage.setItem("geloIntroSpinSeen", "1"); } catch (_) {}
    const startLogoSpin = () => window.setTimeout(spinLogo, 320);
    if (logoFace && !logoFace.complete) logoFace.addEventListener("load", startLogoSpin, { once: true });
    else startLogoSpin();
  }
}

const sections = document.querySelectorAll(".section");
if ("IntersectionObserver" in window && !reducedMotion) {
  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .18 });
  sections.forEach((section) => sectionObserver.observe(section));
} else {
  sections.forEach((section) => section.classList.add("is-visible"));
}

const revealVideo = document.getElementById("revealVideo");
const videoEmbed = document.getElementById("videoEmbed");
const latestSetCard = document.getElementById("latestSetCard");
if (revealVideo && videoEmbed) {
  revealVideo.addEventListener("click", () => {
    const iframe = videoEmbed.querySelector("iframe");
    if (iframe && !iframe.src) iframe.src = iframe.dataset.src;
    videoEmbed.hidden = false;
    revealVideo.hidden = true;
    revealVideo.setAttribute("aria-expanded", "true");
    latestSetCard?.classList.add("player-open");
  });
}

const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
  bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get("name") || "";
    const email = data.get("email") || "";
    const eventType = data.get("event") || "";
    const date = data.get("date") || "";
    const phone = data.get("phone") || "Not provided";
    const location = data.get("location") || "";
    const hours = data.get("hours") || "Not provided";
    const guests = data.get("guests") || "Not provided";
    const details = data.get("details") || "None provided";
    const subject = `Booking Inquiry — ${eventType} — ${date}`;
    const body = [
      "Hi DJ GELO,", "", "I'd like to inquire about booking you for an event.", "",
      `Name: ${name}`, `Email: ${email}`, `Phone: ${phone}`, `Event type: ${eventType}`,
      `Date: ${date}`, `Location / venue: ${location}`, `Event hours: ${hours}`,
      `Approx. guest count: ${guests}`, "", "Details:", details, "", "Thank you!"
    ].join("\n");
    window.location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}



// V20 — local, monochrome social icons (no external icon CDN required).
const brandIconSVG = {
  instagram: `<svg viewBox="0 0 24 24" focusable="false"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2"/><circle cx="12" cy="12" r="4.15"/><circle class="brand-icon-dot" cx="17.35" cy="6.75" r="1.05"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" focusable="false"><path d="M14.1 3.2v11.05a4.35 4.35 0 1 1-3.25-4.2"/><path d="M14.1 3.2c.55 2.65 2.25 4.25 5.05 4.75"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" focusable="false"><rect x="2.6" y="5.4" width="18.8" height="13.2" rx="4"/><path class="brand-icon-fill" d="M10 9.05 15.7 12 10 14.95Z"/></svg>`,
  soundcloud: `<svg viewBox="0 0 24 24" focusable="false"><path d="M3 14.7v2.05M5.2 12.8v5.1M7.45 11.45v6.45M9.7 9.55v8.35"/><path d="M11.9 17.9h6.35a3.05 3.05 0 0 0 .35-6.08 5.1 5.1 0 0 0-9.05-2.05"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" focusable="false"><path class="brand-icon-fill" d="M14.1 21v-8h2.8l.5-3.2h-3.3V7.75c0-.95.35-1.8 1.85-1.8H17.6V3.1c-.7-.1-1.55-.2-2.65-.2-2.8 0-4.7 1.7-4.7 4.85V9.8H7.1V13h3.15v8Z"/></svg>`
};
const brandIcon = (brand, extra = "") => `<span class="brand-icon brand-icon-${brand} ${extra}" aria-hidden="true">${brandIconSVG[brand]}</span>`;
const brandFromHref = (href = "") => {
  if (href.includes("instagram.com")) return "instagram";
  if (href.includes("tiktok.com")) return "tiktok";
  if (href.includes("youtube.com")) return "youtube";
  if (href.includes("soundcloud.com")) return "soundcloud";
  if (href.includes("facebook.com")) return "facebook";
  return "";
};
const decorateSocialLinks = () => {
  document.querySelectorAll(".social-mini, .footer-socials a, .platform-list a, .soundcloud-feature").forEach((link) => {
    const brand = brandFromHref(link.getAttribute("href") || "");
    if (brand && !link.querySelector(":scope > .brand-icon")) link.insertAdjacentHTML("afterbegin", brandIcon(brand));
  });
  document.querySelectorAll(".social-watermark").forEach((node) => {
    node.innerHTML = brandIcon("instagram", "brand-icon-watermark");
  });
};

// Persistent social access. Instagram leads because event updates land there first.
const socialEdge = document.createElement("aside");
socialEdge.className = "social-edge";
socialEdge.setAttribute("aria-label", "DJ GELO social profiles");
socialEdge.innerHTML = `
  <span class="social-edge-label" aria-hidden="true">SOCIAL</span>
  <a class="social-edge-ig" href="https://www.instagram.com/thedjgelo/" target="_blank" rel="noreferrer" aria-label="Instagram — @thedjgelo">${brandIcon("instagram")}<span class="social-edge-name">Instagram</span></a>
  <a href="https://www.tiktok.com/@thedjgelo" target="_blank" rel="noreferrer" aria-label="TikTok — @thedjgelo">${brandIcon("tiktok")}<span class="social-edge-name">TikTok</span></a>
  <a href="https://www.youtube.com/@thedjgelo" target="_blank" rel="noreferrer" aria-label="YouTube — DJ GELO">${brandIcon("youtube")}<span class="social-edge-name">YouTube</span></a>
  <a href="https://soundcloud.com/thedjgelo" target="_blank" rel="noreferrer" aria-label="SoundCloud — DJ GELO">${brandIcon("soundcloud")}<span class="social-edge-name">SoundCloud</span></a>
  <a href="https://www.facebook.com/angelo.abellan" target="_blank" rel="noreferrer" aria-label="Facebook — Angelo Abellan">${brandIcon("facebook")}<span class="social-edge-name">Facebook</span></a>`;
document.body.appendChild(socialEdge);
decorateSocialLinks();

// V14 — vinyl back-to-top control
const vinylTop = document.createElement("button");
vinylTop.type = "button";
vinylTop.className = "vinyl-top";
vinylTop.setAttribute("aria-label", "Back to top");
vinylTop.innerHTML = `
  <svg class="vinyl-rewind" viewBox="0 0 72 72" aria-hidden="true">
    <defs>
      <marker id="vinylArrow" markerWidth="7" markerHeight="7" refX="5.2" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor"></path>
      </marker>
    </defs>
    <path d="M55 19 A25 25 0 1 0 54 54" marker-end="url(#vinylArrow)"></path>
  </svg>
  <span class="vinyl-label">TOP</span>`;
document.body.appendChild(vinylTop);
const updateVinyl = () => vinylTop.classList.toggle("is-visible", window.scrollY > 520);
window.addEventListener("scroll", updateVinyl, { passive: true });
vinylTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));
updateVinyl();

// V14 — simple data-driven events. Edit only events.json to update public dates.
const eventDateParts = (dateString) => {
  const raw = String(dateString || "").trim();
  const fullMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const monthMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (!fullMatch && !monthMatch) return { mon: "TBA", day: "--", year: "", full: raw || "Date TBA", hasDay: false, sortKey: "9999-99-99" };
  const year = Number((fullMatch || monthMatch)[1]);
  const month = Number((fullMatch || monthMatch)[2]);
  const day = fullMatch ? Number(fullMatch[3]) : 1;
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(d.getTime())) return { mon: "TBA", day: "--", year: "", full: raw || "Date TBA", hasDay: false, sortKey: "9999-99-99" };
  const hasDay = Boolean(fullMatch);
  return {
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: hasDay ? d.toLocaleDateString("en-US", { day: "2-digit" }) : "",
    year: String(year),
    full: hasDay ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    hasDay,
    sortKey: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`
  };
};
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const eventCardHTML = (event, pastView = false) => {
  const date = eventDateParts(event.date);
  const isPrivate = event.status === "private";
  const hasFlyer = Boolean(event.flyer);
  const label = event.buttonLabel || "Details";
  const title = event.name || event.venue || (isPrivate ? "Private Event" : "Event");
  const venueDetail = event.venue && event.venue !== title ? event.venue : "";
  const details = [venueDetail, event.city, event.address, event.time, event.age].filter(Boolean).map(escapeHTML).join(" · ");
  const primaryUrl = event.ticketUrl || event.sourceUrl || event.instagramUrl || event.promoterInstagramUrl || event.venueInstagramUrl || "";
  const link = (!isPrivate && primaryUrl) ? `<a class="event-link" href="${escapeHTML(primaryUrl)}" target="_blank" rel="noreferrer">${escapeHTML(label)} ↗</a>` : `<span class="event-meta-chip">${isPrivate ? "PRIVATE BOOKING" : "DETAILS SOON"}</span>`;
  const socialLines = [];
  if (!isPrivate && event.venueInstagramHandle && event.venueInstagramUrl) {
    const handle = `@${String(event.venueInstagramHandle).replace(/^@/, "")}`;
    socialLines.push(`<a class="event-instagram-handle" href="${escapeHTML(event.venueInstagramUrl)}" target="_blank" rel="noreferrer">Venue: ${escapeHTML(handle)} ↗</a>`);
  }
  if (!isPrivate && event.promoterInstagramHandle && event.promoterInstagramUrl) {
    const handle = `@${String(event.promoterInstagramHandle).replace(/^@/, "")}`;
    socialLines.push(`<a class="event-instagram-handle" href="${escapeHTML(event.promoterInstagramUrl)}" target="_blank" rel="noreferrer">Promoter: ${escapeHTML(handle)} ↗</a>`);
  }
  if (!socialLines.length && !isPrivate && event.instagramHandle && event.instagramUrl) {
    const handle = `@${String(event.instagramHandle).replace(/^@/, "")}`;
    socialLines.push(`<a class="event-instagram-handle" href="${escapeHTML(event.instagramUrl)}" target="_blank" rel="noreferrer">Promoter / venue: ${escapeHTML(handle)} ↗</a>`);
  }
  const socialHTML = socialLines.join("");
  const flyerStyle = hasFlyer ? ` style="--flyer:url('${escapeHTML(event.flyer)}')"` : "";
  const dateBlock = date.hasDay
    ? `<div class="event-date${pastView ? " past-known-date" : ""}"><strong>${escapeHTML(date.day)}</strong><span>${escapeHTML(date.mon)} / ${escapeHTML(date.year.slice(-2))}</span></div>`
    : `<div class="event-date past-date"><strong>${escapeHTML(date.mon)}</strong><span>${escapeHTML(date.year)}</span></div>`;
  const dateLabel = date.full;
  return `<article class="event-card ${isPrivate ? "private-event" : ""} ${hasFlyer ? "has-flyer" : ""}"${flyerStyle}>
    ${dateBlock}
    <div class="event-info"><span class="event-type">${escapeHTML(event.type || "EVENT")} // ${escapeHTML(dateLabel)}</span><h3>${escapeHTML(title)}</h3>${details ? `<p>${details}</p>` : ""}${socialHTML}</div>
    <div class="event-actions">${link}</div>
  </article>`;
};
const emptyEventHTML = (past = false) => `<div class="event-empty"><span class="feature-kicker">${past ? "Archive" : "New dates soon"}</span><h3>${past ? "The archive starts here." : "Nothing public on the board yet."}</h3><p>${past ? "Past events will collect here as new dates are added." : "Private bookings stay private. New public dates will show here when they are announced."}</p></div>`;

const upcomingEventsNode = document.getElementById("upcomingEvents");
const pastEventsNode = document.getElementById("pastEvents");
const homeNextEventNode = document.getElementById("homeNextEvent");
if (upcomingEventsNode || pastEventsNode || homeNextEventNode) {
  fetch("/events.json", { cache: "no-store" })
    .then((response) => { if (!response.ok) throw new Error("events.json not found"); return response.json(); })
    .then((data) => {
      const sourceEvents = [
        ...(Array.isArray(data.upcoming) ? data.upcoming : []),
        ...(Array.isArray(data.past) ? data.past : [])
      ];
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      const dateKey = (item) => eventDateParts(item.date).sortKey;
      const upcoming = sourceEvents.filter((item) => dateKey(item) >= todayKey).sort((a,b) => dateKey(a).localeCompare(dateKey(b)));
      const past = sourceEvents.filter((item) => dateKey(item) < todayKey).sort((a,b) => dateKey(b).localeCompare(dateKey(a)));
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = upcoming.length ? upcoming.map(eventCardHTML).join("") : emptyEventHTML(false);
      if (pastEventsNode) pastEventsNode.innerHTML = past.length ? past.map((event) => eventCardHTML(event, true)).join("") : emptyEventHTML(true);
      if (homeNextEventNode) homeNextEventNode.innerHTML = upcoming.length ? eventCardHTML(upcoming[0]) : `<div class="event-empty compact-empty"><span class="feature-kicker">New dates soon</span><h3>No public date announced yet.</h3><p>Check back here or follow @thedjgelo for the next event.</p></div>`;
    })
    .catch(() => {
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = emptyEventHTML(false);
      if (pastEventsNode) pastEventsNode.innerHTML = emptyEventHTML(true);
      if (homeNextEventNode) homeNextEventNode.innerHTML = `<div class="event-empty compact-empty"><span class="feature-kicker">Calendar</span><h3>Dates coming soon.</h3><p>Public events will appear here.</p></div>`;
    });
}

// V26 — Google Analytics 4 interaction tracking.
// Page views, scrolls and outbound clicks are also handled by GA4 Enhanced Measurement when enabled.
const trackGeloEvent = (eventName, params = {}) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
};

// Track meaningful calls-to-action without requiring markup changes on every page.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const href = link.getAttribute("href") || "";
  const label = (link.textContent || link.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 100);

  if (href.startsWith("/book") || /book a set|booking/i.test(label)) {
    trackGeloEvent("book_click", { link_text: label, link_url: link.href });
  }

  const brand = brandFromHref(href);
  if (brand) {
    trackGeloEvent("social_click", { platform: brand, link_url: link.href, link_text: label });
  }

  if (link.closest(".event-card, .events-list, .event-links") || /eventbrite|dice\.fm|posh\.vip|lu\.ma/i.test(href)) {
    trackGeloEvent("event_click", { link_url: link.href, link_text: label });
  }

  if (/instagram\.com/.test(href) && link.closest(".event-card, .events-list, .event-links")) {
    trackGeloEvent("event_instagram_click", { link_url: link.href, link_text: label });
  }
});

if (revealVideo) {
  revealVideo.addEventListener("click", () => {
    trackGeloEvent("latest_set_open", { page_path: window.location.pathname });
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", () => {
    const eventType = bookingForm.querySelector('[name="event"]')?.value || "";
    trackGeloEvent("booking_form_submit", { event_type: eventType });
  });
}
