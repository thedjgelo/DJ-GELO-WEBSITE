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


// V14 — vinyl back-to-top control
const vinylTop = document.createElement("button");
vinylTop.type = "button";
vinylTop.className = "vinyl-top";
vinylTop.setAttribute("aria-label", "Back to top");
document.body.appendChild(vinylTop);
const updateVinyl = () => vinylTop.classList.toggle("is-visible", window.scrollY > 520);
window.addEventListener("scroll", updateVinyl, { passive: true });
vinylTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));
updateVinyl();

// V14 — simple data-driven events. Edit only events.json to update public dates.
const eventDateParts = (dateString) => {
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { mon: "TBA", day: "--", full: dateString || "Date TBA" };
  return {
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { day: "2-digit" }),
    full: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  };
};
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const eventCardHTML = (event) => {
  const date = eventDateParts(event.date);
  const isPrivate = event.status === "private";
  const hasFlyer = Boolean(event.flyer);
  const label = event.buttonLabel || "Details";
  const venue = isPrivate ? (event.name || "Private Event") : (event.venue || event.name || "Event");
  const title = event.name && event.name !== venue ? event.name : venue;
  const details = [event.city, event.time, event.age].filter(Boolean).map(escapeHTML).join(" · ");
  const link = (!isPrivate && event.ticketUrl) ? `<a class="event-link" href="${escapeHTML(event.ticketUrl)}" target="_blank" rel="noreferrer">${escapeHTML(label)} ↗</a>` : `<span class="event-meta-chip">${isPrivate ? "PRIVATE BOOKING" : "DETAILS SOON"}</span>`;
  const flyerStyle = hasFlyer ? ` style="--flyer:url('${escapeHTML(event.flyer)}')"` : "";
  return `<article class="event-card ${isPrivate ? "private-event" : ""} ${hasFlyer ? "has-flyer" : ""}"${flyerStyle}>
    <div class="event-date"><strong>${escapeHTML(date.day)}</strong><span>${escapeHTML(date.mon)} / ${escapeHTML(String(new Date(`${event.date}T12:00:00`).getFullYear()).slice(-2))}</span></div>
    <div class="event-info"><span class="event-type">${escapeHTML(event.type || "EVENT")} // ${escapeHTML(date.full)}</span><h3>${escapeHTML(title)}</h3>${details ? `<p>${details}</p>` : ""}</div>
    <div class="event-actions">${link}</div>
  </article>`;
};
const emptyEventHTML = (past = false) => `<div class="event-empty"><span class="feature-kicker">${past ? "Archive" : "New dates soon"}</span><h3>${past ? "The archive starts here." : "Nothing public on the board yet."}</h3><p>${past ? "Past rooms will collect here as events are added." : "Private bookings stay private. New public dates will show here when they are announced."}</p></div>`;

const upcomingEventsNode = document.getElementById("upcomingEvents");
const pastEventsNode = document.getElementById("pastEvents");
const homeNextEventNode = document.getElementById("homeNextEvent");
if (upcomingEventsNode || pastEventsNode || homeNextEventNode) {
  fetch("events.json", { cache: "no-store" })
    .then((response) => { if (!response.ok) throw new Error("events.json not found"); return response.json(); })
    .then((data) => {
      const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
      const past = Array.isArray(data.past) ? data.past : [];
      upcoming.sort((a,b) => String(a.date).localeCompare(String(b.date)));
      past.sort((a,b) => String(b.date).localeCompare(String(a.date)));
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = upcoming.length ? upcoming.map(eventCardHTML).join("") : emptyEventHTML(false);
      if (pastEventsNode) pastEventsNode.innerHTML = past.length ? past.map(eventCardHTML).join("") : emptyEventHTML(true);
      if (homeNextEventNode) homeNextEventNode.innerHTML = upcoming.length ? eventCardHTML(upcoming[0]) : `<div class="event-empty compact-empty"><span class="feature-kicker">New dates soon</span><h3>No public date announced yet.</h3><p>Check back here or follow @thedjgelo for the next room.</p></div>`;
    })
    .catch(() => {
      if (upcomingEventsNode) upcomingEventsNode.innerHTML = emptyEventHTML(false);
      if (pastEventsNode) pastEventsNode.innerHTML = emptyEventHTML(true);
      if (homeNextEventNode) homeNextEventNode.innerHTML = `<div class="event-empty compact-empty"><span class="feature-kicker">Calendar</span><h3>Dates coming soon.</h3><p>Public events will appear here.</p></div>`;
    });
}
