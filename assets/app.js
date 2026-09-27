/* ==========================================================
   Portfolio app
   - Reads the master CSV (one row per project, row order = page order)
   - Each project's images live in projects/<folder>/1.jpg, 2.jpg, 3.jpg ...
     1.jpg is the card cover; every numbered .jpg appears in the gallery.
   ========================================================== */

const CONFIG = {
  // Local file by default. To edit in Google Sheets instead, use
  // File > Share > Publish to web > CSV, and paste that link here.
  csvUrl: "projects.csv",
  imageDir: "projects",
  maxImages: 40,          // safety cap per project
  // Checked in this order for each number. Cloudflare is case-sensitive,
  // so upper-case versions are included too.
  extensions: ["jpg", "jpeg", "png", "webp", "avif", "gif", "JPG", "JPEG", "PNG", "WEBP"],
  autoplayMs: 4500        // gallery auto-scroll interval
};

/* ---------- CSV parsing (handles quotes, commas and line breaks in cells) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(v => v.trim() !== ""));
  const keys = head.map(h => h.trim().toLowerCase());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

const lines = v => v.split(/\n|\s\|\s/).map(s => s.trim()).filter(Boolean);

function toProject(r) {
  const results = [];
  for (let i = 1; i <= 8; i++) {
    const text = r[`result${i}_text`], figure = r[`result${i}_figure`];
    if (text || figure) results.push({ figure, text: text || "" });
  }
  const action = lines(r.action || "");
  return {
    folder: r.folder,
    title: r.title,
    client: r.client,
    summary: r.summary,
    headline: r.headline,
    tags: (r.tags || "").split(";").map(s => s.trim()).filter(Boolean),
    note: r.note,
    situation: r.situation,
    task: r.task,
    action: action.length > 1 ? action : action[0] || "",
    coverAlt: r.cover_alt,
    results
  };
}

/* ---------- Image discovery: 1, 2, 3 ... (any extension) until the first gap ---------- */
const imgBase = p => `${CONFIG.imageDir}/${encodeURIComponent(p.folder)}/`;

function imageExists(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(true);
    im.onerror = () => res(false);
    im.src = src;
  });
}

// Try every extension for one number at once; return the first match in CONFIG order.
async function findNumbered(p, n) {
  const srcs = CONFIG.extensions.map(ext => `${imgBase(p)}${n}.${ext}`);
  const hits = await Promise.all(srcs.map(imageExists));
  const i = hits.indexOf(true);
  return i === -1 ? null : srcs[i];
}

const galleryCache = new Map();
const coverCache = new Map();
function findCover(p) {
  if (!coverCache.has(p.folder)) coverCache.set(p.folder, findNumbered(p, 1));
  return coverCache.get(p.folder);
}
async function findImages(p) {
  if (galleryCache.has(p.folder)) return galleryCache.get(p.folder);
  const found = [];
  const first = await findCover(p);
  if (first) {
    found.push(first);
    for (let n = 2; n <= CONFIG.maxImages; n++) {
      const src = await findNumbered(p, n);
      if (!src) break;
      found.push(src);
    }
  }
  galleryCache.set(p.folder, found);
  return found;
}

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const block = v => Array.isArray(v) ? `<ul>${v.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : esc(v);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function placeholderArt(seed) {
  const shift = (seed * 37) % 120;
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="200" class="forest-fill"/>
    ${[20, 44, 68, 92, 116, 140].map((r, i) => `<ellipse class="contour" cx="${90 + shift + i * 3}" cy="${120 - i * 2}" rx="${r * 1.4}" ry="${r}"/>`).join("")}
    <rect x="236" y="120" width="48" height="80" class="rust-fill"/>
    <rect x="292" y="152" width="28" height="48" class="ochre-fill"/>
  </svg>`;
}

/* ---------- Cards ---------- */
let PROJECTS = [];

function renderCards() {
  const grid = $("grid");
  grid.innerHTML = PROJECTS.map((p, i) => `
    <button class="card" type="button" data-folder="${esc(p.folder)}" aria-haspopup="dialog">
      <div class="card-media">
        ${placeholderArt(i + 1)}
      </div>
      <div class="card-body">
        <p class="label">${esc(p.client)}</p>
        <h3>${esc(p.title)}</h3>
        <p class="card-sum">${esc(p.summary)}</p>
        ${p.headline ? `<p class="card-result">${esc(p.headline)}</p>` : ""}
        <span class="card-more">Read the case study</span>
      </div>
    </button>`).join("");
  // Add each cover once it's found
  grid.querySelectorAll(".card").forEach(card => {
    const p = PROJECTS.find(x => x.folder === card.dataset.folder);
    findCover(p).then(src => {
      if (!src) return;
      const img = new Image();
      img.src = src; img.alt = p.coverAlt || ""; img.decoding = "async";
      card.querySelector(".card-media").appendChild(img);
    });
  });
}

/* ---------- Gallery ---------- */
const gallery = { imgs: [], index: 0, timer: null, paused: false };

function goTo(i, smooth = true) {
  const track = $("g-track");
  const n = gallery.imgs.length;
  if (!n) return;
  gallery.index = (i + n) % n;
  track.scrollTo({ left: track.clientWidth * gallery.index, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  [...$("g-dots").children].forEach((d, k) => d.setAttribute("aria-current", k === gallery.index));
}

function startAuto() {
  stopAuto();
  if (reduceMotion || gallery.imgs.length < 2) return;
  gallery.timer = setInterval(() => { if (!gallery.paused) goTo(gallery.index + 1); }, CONFIG.autoplayMs);
}
function stopAuto() { clearInterval(gallery.timer); gallery.timer = null; }

async function loadGallery(p) {
  const box = $("m-gallery"), track = $("g-track"), dots = $("g-dots");
  box.hidden = true; track.innerHTML = ""; dots.innerHTML = "";
  const imgs = await findImages(p);
  if (!$("modal").open || $("modal").dataset.folder !== p.folder) return;
  gallery.imgs = imgs; gallery.index = 0;
  if (!imgs.length) return;
  track.innerHTML = imgs.map((src, i) =>
    `<img src="${src}" alt="${esc(i === 0 && p.coverAlt ? p.coverAlt : `${p.title}, image ${i + 1} of ${imgs.length}`)}" ${i ? 'loading="lazy"' : ""}>`).join("");
  const multi = imgs.length > 1;
  $("g-prev").hidden = $("g-next").hidden = dots.hidden = !multi;
  dots.innerHTML = multi ? imgs.map((_, i) => `<button type="button" aria-label="Show image ${i + 1}" aria-current="${i === 0}"></button>`).join("") : "";
  box.hidden = false;
  track.scrollLeft = 0;
  startAuto();
}

function wireGallery() {
  const box = $("m-gallery"), track = $("g-track");
  $("g-prev").addEventListener("click", () => { goTo(gallery.index - 1); startAuto(); });
  $("g-next").addEventListener("click", () => { goTo(gallery.index + 1); startAuto(); });
  $("g-dots").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) { goTo([...b.parentNode.children].indexOf(b)); startAuto(); }
  });
  ["focusin", "touchstart"].forEach(ev => box.addEventListener(ev, () => gallery.paused = true, { passive: true }));
  ["focusout", "touchend"].forEach(ev => box.addEventListener(ev, () => gallery.paused = false, { passive: true }));
  // Keep the dots in step when someone swipes
  let t;
  track.addEventListener("scroll", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== gallery.index) { gallery.index = i; [...$("g-dots").children].forEach((d, k) => d.setAttribute("aria-current", k === i)); }
    }, 80);
  }, { passive: true });
  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { goTo(gallery.index + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { goTo(gallery.index - 1); e.preventDefault(); }
  });
  window.addEventListener("resize", () => goTo(gallery.index, false));
}

/* ---------- Modal ---------- */
function openProject(folder) {
  const p = PROJECTS.find(x => x.folder === folder);
  if (!p) return;
  const modal = $("modal");
  modal.dataset.folder = p.folder;
  $("m-meta").textContent = p.client;
  $("m-title").textContent = p.title;
  $("m-tags").innerHTML = p.tags.map(t => `<li>${esc(t)}</li>`).join("");
  $("m-note").hidden = !p.note;
  $("m-note").textContent = p.note || "";
  $("m-star").innerHTML = [["Situation", p.situation], ["Task", p.task], ["Action", p.action]]
    .filter(([, v]) => v && v.length)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${block(v)}</dd></div>`).join("");
  $("m-results").innerHTML = p.results.map(r => r.figure
    ? `<li><strong>${esc(r.figure)}</strong><span>${esc(r.text)}</span></li>`
    : `<li class="plain"><span>${esc(r.text)}</span></li>`).join("");
  $("m-results").closest(".results").hidden = !p.results.length;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  history.replaceState(null, "", "#" + p.folder);
  loadGallery(p);
}

function wireModal() {
  const modal = $("modal");
  modal.addEventListener("close", () => {
    stopAuto();
    delete modal.dataset.folder;
    history.replaceState(null, "", location.pathname + location.search);
  });
  modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });
  $("m-close").addEventListener("click", () => modal.close());
  $("grid").addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card) openProject(card.dataset.folder);
  });
}

/* ---------- Start ---------- */
async function init() {
  $("yr").textContent = new Date().getFullYear();
  wireModal();
  wireGallery();
  try {
    const res = await fetch(CONFIG.csvUrl, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    PROJECTS = parseCSV(await res.text())
      .filter(r => r.folder && !/^(no|false|0|draft)$/i.test(r.published || "yes"))
      .map(toProject);
    renderCards();
    if (location.hash.length > 1) openProject(decodeURIComponent(location.hash.slice(1)));
  } catch (err) {
    $("grid").innerHTML = `<p class="load-error">Projects couldn't be loaded from ${esc(CONFIG.csvUrl)}. If you're opening the file directly from your computer, run a local server instead (see README).</p>`;
    console.error(err);
  }
}
document.addEventListener("DOMContentLoaded", init);
