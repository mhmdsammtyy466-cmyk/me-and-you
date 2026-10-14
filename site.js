/* بارگذاری محتوا و عکس‌ها از Supabase (بدون نیاز به کتابخانه‌ی خارجی).
 * - ابتدا نسخه‌ی ذخیره‌شده‌ی قبلی نمایش داده می‌شود تا صفحه فوراً کامل دیده شود.
 * - سپس نسخه‌ی تازه گرفته می‌شود؛ اگر اینترنت ضعیف بود، همان نسخه‌ی قبلی می‌ماند.
 */
(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = cfg.url && cfg.anonKey &&
    !cfg.url.includes("YOUR_PROJECT_ID") && !cfg.anonKey.includes("YOUR_SUPABASE");
  const base = (cfg.url || "").replace(/\/$/, "");
  const CACHE_KEY = "meandyou-cache-v1";
  const statusEl = document.getElementById("cloudStatus");
  const setStatus = (msg) => { if (statusEl) { statusEl.textContent = msg || ""; statusEl.hidden = !msg; } };

  // متن فنیِ قدیمیِ زیرعنوان گالری که نباید به مخاطب نشان داده شود.
  const LEGACY_GALLERY_SUB = "خاطره‌های تصویری‌مان؛ عکس‌های تازه از فضای ابری بارگذاری می‌شوند و برای همه نمایش داده می‌شوند.";

  function applyContent(content) {
    const get = (key) => content[key] == null ? null : String(content[key]);
    const setText = (selector, key) => {
      const el = document.querySelector(selector), value = get(key);
      if (el && value !== null) el.textContent = value;
    };
    setText("#gate .gate-title", "gate_title");
    setText("#gate .gate-sub", "gate_subtitle");
    setText("#openGate", "gate_button");
    setText(".hero .eyebrow", "hero_eyebrow");
    const h1 = document.querySelector(".hero h1");
    if (h1 && get("hero_title") !== null) {
      const span = h1.querySelector("span");
      h1.textContent = get("hero_title") + " ";
      if (span) { span.textContent = get("hero_tagline") ?? span.textContent; h1.appendChild(span); }
    } else {
      setText(".hero h1 span", "hero_tagline");
    }
    setText(".hero .lead", "hero_lead");
    setText(".hero .scroll", "hero_scroll");
    setText("#letter .section-title", "letter_heading");
    setText("#letter .section-sub", "letter_subtitle");
    setText("#letter .letter", "letter_body");
    setText("#letter .signature", "signature");
    const gallery = document.getElementById("photos");
    const section = gallery && gallery.closest("section");
    if (section) {
      const title = section.querySelector(".section-title"), sub = section.querySelector(".section-sub");
      if (title && get("gallery_heading") !== null) title.textContent = get("gallery_heading");
      if (sub && get("gallery_subtitle") !== null && get("gallery_subtitle") !== LEGACY_GALLERY_SUB) sub.textContent = get("gallery_subtitle");
    }
    setText(".counter .section-title", "counter_heading");
    setText(".counter small", "counter_subtitle");
    document.querySelectorAll(".secret").forEach((card, i) => {
      const n = i + 1, title = card.querySelector("b"), body = card.querySelector("p");
      if (title && get(`secret_${n}_title`) !== null) title.textContent = get(`secret_${n}_title`);
      if (body && get(`secret_${n}_body`) !== null) body.textContent = get(`secret_${n}_body`);
    });
    setText(".ending h2", "ending_heading");
    setText(".ending p", "ending_body");
    setText("footer", "footer_text");

    const startDate = get("start_date");
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      window.CLOUD_START_DATE = startDate;
      if (typeof window.updateCounter === "function") window.updateCounter();
    }
  }

  const photoUrl = (path) =>
    `${base}/storage/v1/object/public/gallery/${String(path).split("/").map(encodeURIComponent).join("/")}`;

  function renderGallery(rows) {
    const gallery = document.getElementById("photos");
    if (!gallery) return;
    gallery.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "photos-empty";
      empty.textContent = "به‌زودی عکس‌های ما اینجا میاد 🤍";
      gallery.appendChild(empty);
      return;
    }
    rows.forEach((row) => {
      const box = document.createElement("div");
      box.className = "photo";
      const head = document.createElement("div");
      head.className = "photo-head";
      head.textContent = row.title || "خاطره 🤍";
      const img = document.createElement("img");
      img.src = photoUrl(row.storage_path);
      img.alt = row.title || "عکس خاطره";
      img.loading = "lazy";
      img.decoding = "async";
      box.append(head, img);
      gallery.appendChild(box);
    });
  }

  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; } };
  const writeCache = (data) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* حافظه پر یا غیرفعال */ } };

  async function api(path) {
    const headers = { apikey: cfg.anonKey };
    if (/^eyJ/.test(cfg.anonKey)) headers.Authorization = "Bearer " + cfg.anonKey; // کلید قدیمی (JWT)
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`${base}/rest/v1/${path}`, { headers, signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  async function start() {
    const friendlyEmpty = () => renderGallery([]);
    if (!configured) { friendlyEmpty(); return; }

    const cached = readCache();
    if (cached) {
      applyContent(cached.content || {});
      renderGallery(cached.photos || []);
    }

    try {
      const [settings, photos] = await Promise.all([
        api("site_content?select=key,value"),
        api("gallery_photos?select=id,title,storage_path,created_at&order=created_at.asc")
      ]);
      const content = {};
      (settings || []).forEach((row) => { content[row.key] = row.value; });
      applyContent(content);
      renderGallery(photos || []);
      writeCache({ content, photos: photos || [], at: Date.now() });
      setStatus("");
    } catch (err) {
      console.error("Load failed:", err);
      if (!cached) {
        friendlyEmpty();
        setStatus("الان نتونستم خاطره‌ها رو بارگذاری کنم؛ اینترنتت رو چک کن و صفحه رو دوباره باز کن 🤍");
      }
    }
  }
  start();
})();
