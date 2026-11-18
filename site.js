const BOOKING_EMAIL = "thedjgelo@gmail.com";

// V32 — Supabase-backed events + inquiries with a safe legacy fallback.
const getSupabaseClient = () => {
  const config = window.DJGELO_SUPABASE || {};
  const configured = config.url && config.publishableKey && !config.url.startsWith("YOUR_") && !config.publishableKey.startsWith("YOUR_");
  if (!configured || !window.supabase?.createClient) return null;
  if (!window.__djgeloSupabaseClient) {
    window.__djgeloSupabaseClient = window.supabase.createClient(config.url, config.publishableKey);
  }
  return window.__djgeloSupabaseClient;
};

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
const bookingConfirmation = document.getElementById("bookingConfirmation");
let bookingConfirmationTimer;

const showBookingConfirmation = () => {
  if (!bookingConfirmation) return;
  window.clearTimeout(bookingConfirmationTimer);
  bookingConfirmation.hidden = false;
  bookingConfirmation.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => {
    bookingConfirmation.classList.add("is-visible");
  });
  bookingConfirmationTimer = window.setTimeout(() => {
    bookingConfirmation.classList.remove("is-visible");
    bookingConfirmation.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      bookingConfirmation.hidden = true;
    }, 320);
  }, 4200);
};

if (bookingForm) {
  bookingForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const statusNode = document.getElementById("bookingFormStatus");
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      event_type: String(data.get("event") || "").trim(),
      event_date: String(data.get("date") || "").trim(),
      location: String(data.get("location") || "").trim(),
      event_hours: String(data.get("hours") || "").trim(),
      guest_count: String(data.get("guests") || "").trim(),
      details: String(data.get("details") || "").trim(),
      website: String(data.get("website") || "").trim()
    };

    const setStatus = (message, state = "") => {
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.dataset.state = state;
    };

    const client = getSupabaseClient();
    if (client) {
      submitButton?.setAttribute("disabled", "disabled");
      setStatus("Sending your inquiry…", "working");
      try {
        const { data: result, error } = await client.functions.invoke("submit-inquiry", { body: payload });
        if (error) throw error;
        if (!result?.ok) throw new Error(result?.error || "Unable to submit inquiry");
        form.reset();
        setStatus("", "");
        showBookingConfirmation();
        trackGeloEvent("booking_inquiry_submit", { event_type: payload.event_type });
        return;
      } catch (error) {
        console.error("Booking inquiry submit failed:", error);
        setStatus("The online form is temporarily unavailable. Opening an email draft instead…", "error");
      } finally {
        submitButton?.removeAttribute("disabled");
      }
    }

    // Safe fallback until Supabase is configured, or if the server endpoint is unavailable.
    const subject = `Booking Inquiry — ${payload.event_type} — ${payload.event_date}`;
    const body = [
      "Hi DJ GELO,", "", "I'd like to inquire about booking you for an event.", "",
      `Name: ${payload.name}`, `Email: ${payload.email}`, `Phone: ${payload.phone || "Not provided"}`, `Event type: ${payload.event_type}`,
      `Date: ${payload.event_date}`, `Location / venue: ${payload.location}`, `Event hours: ${payload.event_hours || "Not provided"}`,
      `Approx. guest count: ${payload.guest_count || "Not provided"}`, "", "Details:", payload.details || "None provided", "", "Thank you!"
    ].join("\n");
    const gmailDraft = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(BOOKING_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const draftWindow = window.open(gmailDraft, "_blank", "noopener,noreferrer");
    if (!draftWindow) window.location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

// V32 — data-driven events from Supabase, with events.json as a fallback.
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
const normalizeDbEvent = (row) => ({
  id: row.id,
  date: row.event_date,
  name: row.name,
  venue: row.venue,
  city: row.city,
  address: row.address,
  time: row.time_label,
  age: row.age,
  type: row.event_type,
  status: row.visibility || row.status || "public",
  promoterInstagramHandle: row.promoter_instagram_handle,
  promoterInstagramUrl: row.promoter_instagram_url,
  venueInstagramHandle: row.venue_instagram_handle,
  venueInstagramUrl: row.venue_instagram_url,
  instagramUrl: row.instagram_url,
  sourceUrl: row.source_url,
  ticketUrl: row.ticket_url,
  buttonLabel: row.button_label,
  flyer: row.flyer_url,
  embedUrl: row.embed_url,
  eventBrand: row.event_brand || "djgelo",
  archiveVisible: row.archive_visible !== false,
  publicCategory: row.public_category || "other"
});
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
  const socialHTML = socialLines.join("");
  const flyerStyle = hasFlyer ? ` style="--flyer:url('${escapeHTML(event.flyer)}')"` : "";
  const dateBlock = date.hasDay
    ? `<div class="event-date${pastView ? " past-known-date" : ""}"><strong>${escapeHTML(date.day)}</strong><span>${escapeHTML(date.mon)}</span></div>`
    : `<div class="event-date past-date"><strong>${escapeHTML(date.mon)}</strong><span>${escapeHTML(date.year)}</span></div>`;
  const brand = event.eventBrand || (/back2thebooth/i.test(event.promoterInstagramHandle || "") || /back 2 the booth|b2tb|back in the bay/i.test(title) ? "b2tb" : "djgelo");
  const brandLabel = brand === "b2tb" ? "BACK 2 THE BOOTH" : "DJ GELO";
  const showEmbed = Boolean(event.embedUrl) && (document.body.classList.contains("page-events") || document.body.classList.contains("page-b2tb")) && !pastView && !isPrivate;
  const embed = showEmbed ? `<div class="event-ticket-embed"><iframe src="${escapeHTML(event.embedUrl)}" height="700" width="100%" title="${escapeHTML(title)} tickets" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : "";
  return `<article class="event-card ${isPrivate ? "private-event" : ""} ${hasFlyer ? "has-flyer" : ""}"${flyerStyle}>
    ${dateBlock}
    <div class="event-info"><div class="event-label-row"><span class="event-brand-badge ${brand === "b2tb" ? "is-b2tb" : ""}">${escapeHTML(brandLabel)}</span><span class="event-type">${escapeHTML(event.type || "EVENT")}</span></div><h3>${escapeHTML(title)}</h3>${details ? `<p>${details}</p>` : ""}${socialHTML}</div>
    <div class="event-actions">${link}</div>
    ${embed}
  </article>`;
};
const archiveFilterNode = document.getElementById("archiveFilters");
const archiveToggleNode = document.getElementById("archiveToggle");
let archiveExpanded = false;
let archiveFilter = "all";
let archiveSource = [];
const inferArchiveCategory = (event) => {
  if (event.eventBrand === "b2tb") return "b2tb";
  const hay = `${event.type || ""} ${event.name || ""} ${event.venue || ""}`.toLowerCase();
  if (/concert|opening/.test(hay)) return "concert";
  if (/school|prom|homecoming|winter ball|college/.test(hay)) return "school";
  if (/club|bar|lounge|night/.test(hay)) return "club";
  return event.publicCategory || "other";
};
const archiveRowHTML = (event) => {
  const date = eventDateParts(event.date);
  const title = event.name || event.venue || "Event";
  const brand = event.eventBrand || "djgelo";
  const detail = [event.venue && event.venue !== title ? event.venue : "", event.city].filter(Boolean).join(" · ");
  const url = event.ticketUrl || event.sourceUrl || event.instagramUrl || event.promoterInstagramUrl || event.venueInstagramUrl || "";
  return `<article class="archive-event-row"><div class="archive-date"><strong>${escapeHTML(date.mon)}</strong><span>${escapeHTML(date.day || date.year)}</span></div><div class="archive-copy"><div class="archive-labels"><span class="event-brand-badge ${brand === "b2tb" ? "is-b2tb" : ""}">${brand === "b2tb" ? "BACK 2 THE BOOTH" : "DJ GELO"}</span><span>${escapeHTML((event.type || "EVENT").toUpperCase())}</span></div><h3>${escapeHTML(title)}</h3>${detail ? `<p>${escapeHTML(detail)}</p>` : ""}</div>${url ? `<a class="archive-link" href="${escapeHTML(url)}" target="_blank" rel="noreferrer" aria-label="Open details for ${escapeHTML(title)}">↗</a>` : ""}</article>`;
};
const renderPastArchive = () => {
  if (!pastEventsNode) return;
  let rows = archiveSource.filter(event => event.archiveVisible !== false);
  if (archiveFilter === "djgelo") rows = rows.filter(event => (event.eventBrand || "djgelo") === "djgelo");
  else if (archiveFilter === "b2tb") rows = rows.filter(event => (event.eventBrand || "djgelo") === "b2tb");
  else if (archiveFilter !== "all") rows = rows.filter(event => inferArchiveCategory(event) === archiveFilter);
  const visible = archiveExpanded ? rows : rows.slice(0, 8);
  const byYear = visible.reduce((map, event) => { const year = eventDateParts(event.date).year || "Archive"; (map[year] ||= []).push(event); return map; }, {});
  pastEventsNode.innerHTML = visible.length ? Object.entries(byYear).sort((a,b)=>String(b[0]).localeCompare(String(a[0]))).map(([year,items]) => `<section class="archive-year"><h3>${escapeHTML(year)}</h3><div class="archive-year-list">${items.map(archiveRowHTML).join("")}</div></section>`).join("") : emptyEventHTML(true);
  if (archiveToggleNode) { archiveToggleNode.hidden = rows.length <= 8; archiveToggleNode.textContent = archiveExpanded ? "Show recent only ↑" : `View full archive (${rows.length}) ↓`; }
};
if (archiveFilterNode) archiveFilterNode.addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; archiveFilter = button.dataset.filter || "all"; archiveExpanded = false; archiveFilterNode.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("is-active", b === button)); renderPastArchive(); });
if (archiveToggleNode) archiveToggleNode.addEventListener("click", () => { archiveExpanded = !archiveExpanded; renderPastArchive(); });

const emptyEventHTML = (past = false) => `<div class="event-empty"><span class="feature-kicker">${past ? "Archive" : "New dates soon"}</span><h3>${past ? "The archive starts here." : "Nothing public on the board yet."}</h3><p>${past ? "Past events will collect here as new dates are added." : "Private bookings stay private. New public dates will show here when they are announced."}</p></div>`;

const loadEventsFromJson = async () => {
  const response = await fetch("/events.json", { cache: "no-store" });
  if (!response.ok) throw new Error("events.json not found");
  const data = await response.json();
  return [
    ...(Array.isArray(data.upcoming) ? data.upcoming : []),
    ...(Array.isArray(data.past) ? data.past : [])
  ];
};
const loadPublicEvents = async () => {
  const client = getSupabaseClient();
  if (!client) return loadEventsFromJson();
  const { data, error } = await client.from("events").select("*").eq("status", "published").order("event_date", { ascending: true });
  if (error) {
    console.warn("Supabase event load failed; using events.json fallback.", error);
    return loadEventsFromJson();
  }
  return (data || []).map(normalizeDbEvent);
};

const upcomingEventsNode = document.getElementById("upcomingEvents");
const pastEventsNode = document.getElementById("pastEvents");
const homeNextEventNode = document.getElementById("homeNextEvent");
const b2tbUpcomingNode = document.getElementById("b2tbUpcoming");
const b2tbPastNode = document.getElementById("b2tbPast");
if (upcomingEventsNode || pastEventsNode || homeNextEventNode || b2tbUpcomingNode || b2tbPastNode) {
  loadPublicEvents()
    .then((sourceEvents) => {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      const dateKey = (item) => eventDateParts(item.date).sortKey;
      const normalizeBrand = (item) => item.eventBrand || (/back2thebooth/i.test(item.promoterInstagramHandle || "") || /back 2 the booth|b2tb|back in the bay/i.test(item.name || "") ? "b2tb" : "djgelo");
      const publicEvents = sourceEvents.filter((item) => item.status !== 'private');
      const upcoming = publicEvents.filter((item) => dateKey(item) >= todayKey).sort((a,b) => dateKey(a).localeCompare(dateKey(b)));
      const past = publicEvents.filter((item) => dateKey(item) < todayKey).sort((a,b) => dateKey(b).localeCompare(dateKey(a)));
      const b2tbUpcoming = upcoming.filter((item) => normalizeBrand(item) === "b2tb");
      const b2tbPast = past.filter((item) => normalizeBrand(item) === "b2tb");
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = upcoming.length ? upcoming.map(eventCardHTML).join("") : emptyEventHTML(false);
      if (pastEventsNode) { archiveSource = past; renderPastArchive(); }
      if (homeNextEventNode) homeNextEventNode.innerHTML = upcoming.length ? eventCardHTML(upcoming[0]) : `<div class="event-empty compact-empty"><span class="feature-kicker">New dates soon</span><h3>No public date announced yet.</h3><p>Check back here or follow @thedjgelo for the next event.</p></div>`;
      if (b2tbUpcomingNode) b2tbUpcomingNode.innerHTML = b2tbUpcoming.length ? b2tbUpcoming.map(eventCardHTML).join("") : `<div class="event-empty"><span class="feature-kicker">Next event</span><h3>New B2TB date soon.</h3><p>Follow @back2thebooth for the next announcement.</p></div>`;
      if (b2tbPastNode) b2tbPastNode.innerHTML = b2tbPast.length ? b2tbPast.map((event) => eventCardHTML(event, true)).join("") : `<div class="event-empty"><span class="feature-kicker">Archive</span><h3>Past B2TB events will live here.</h3></div>`;
    })
    .catch((error) => {
      console.error("Event loading failed:", error);
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = emptyEventHTML(false);
      if (pastEventsNode) pastEventsNode.innerHTML = emptyEventHTML(true);
      if (homeNextEventNode) homeNextEventNode.innerHTML = `<div class="event-empty compact-empty"><span class="feature-kicker">Calendar</span><h3>Dates coming soon.</h3><p>Public events will appear here.</p></div>`;
      if (b2tbUpcomingNode) b2tbUpcomingNode.innerHTML = emptyEventHTML(false);
      if (b2tbPastNode) b2tbPastNode.innerHTML = emptyEventHTML(true);
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
    trackGeloEvent("booking_inquiry_start", { event_type: eventType });
  });
}
