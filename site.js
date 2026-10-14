(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = cfg.url && cfg.anonKey &&
    !cfg.url.includes("YOUR_PROJECT_ID") &&
    !cfg.anonKey.includes("YOUR_SUPABASE");
  const statusEl = document.getElementById("cloudStatus");
  const setStatus = (message) => { if (statusEl) statusEl.textContent = message; };

  // Map editable content keys to elements in the original page.
  function applyContent(content) {
    const get = (key) => content[key] == null ? null : String(content[key]);
    const setText = (selector, key) => {
      const el = document.querySelector(selector), value = get(key);
      if (el && value !== null) el.textContent = value;
    };
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
    if (gallery) {
      const section = gallery.closest("section");
      if (section) {
        const title = section.querySelector(".section-title");
        const sub = section.querySelector(".section-sub");
        if (title && get("gallery_heading") !== null) title.textContent = get("gallery_heading");
        if (sub && get("gallery_subtitle") !== null) sub.textContent = get("gallery_subtitle");
      }
    }
    setText(".counter .section-title", "counter_heading");
    setText(".counter small", "counter_subtitle");
    const secrets = [...document.querySelectorAll(".secret")];
    secrets.forEach((card, i) => {
      const n = i + 1;
      const title = card.querySelector("b");
      const body = card.querySelector("p");
      if (title && get(`secret_${n}_title`) !== null) title.textContent = get(`secret_${n}_title`);
      if (body && get(`secret_${n}_body`) !== null) body.textContent = get(`secret_${n}_body`);
    });
    setText(".ending h2", "ending_heading");
    setText(".ending p", "ending_body");
    setText("footer", "footer_text");

    const startDate = get("start_date");
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      // Replace only the start date token used by the original counter function.
      window.CLOUD_START_DATE = startDate;
      const [y, m, d] = startDate.split("-").map(Number);
      const start = new Date(y, m - 1, d);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const days = Math.max(0, Math.floor((today - start) / 86400000));
      const num = String(days).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
      const dayEl = document.getElementById("days");
      if (dayEl) dayEl.textContent = num;
    }
  }

  function renderGallery(rows, supabase) {
    const gallery = document.getElementById("photos");
    if (!gallery || !Array.isArray(rows) || !rows.length) return;
    // Keep the original embedded photos and append cloud photos after them.
    rows.forEach((row) => {
      const box = document.createElement("div");
      box.className = "photo";
      const head = document.createElement("div");
      head.className = "photo-head";
      const title = document.createElement("span");
      title.textContent = row.title || "خاطره 🤍";
      head.appendChild(title);
      const img = document.createElement("img");
      const { data } = supabase.storage.from("gallery").getPublicUrl(row.storage_path);
      img.src = data.publicUrl;
      img.alt = row.title || "عکس خاطره";
      img.loading = "lazy";
      box.appendChild(head);
      box.appendChild(img);
      gallery.appendChild(box);
    });
  }

  async function start() {
    if (!configured || !window.supabase?.createClient) {
      setStatus("برای فعال شدن فضای ابری، آدرس و کلید عمومی Supabase را در supabase-config.js وارد کن.");
      return;
    }
    const supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
    try {
      const { data: settings, error: settingsError } = await supabase
        .from("site_content").select("key,value");
      if (settingsError) throw settingsError;
      const content = {};
      (settings || []).forEach(row => content[row.key] = row.value);
      applyContent(content);

      const { data: photos, error: photoError } = await supabase
        .from("gallery_photos").select("id,title,storage_path,created_at")
        .order("created_at", { ascending: true });
      if (photoError) throw photoError;
      if (photos && photos.length) renderGallery(photos, supabase);
      setStatus(photos && photos.length
        ? `عکس‌ها از فضای ابری بارگذاری شدند (${photos.length} عکس).`
        : "اتصال به فضای ابری برقرار است؛ عکس‌های فعلی صفحه نمایش داده می‌شوند تا وقتی عکس‌های ابری اضافه شوند.");
    } catch (err) {
      console.error("Supabase load failed:", err);
      setStatus("بارگذاری فضای ابری ناموفق بود. تنظیمات Supabase و قوانین دسترسی (RLS) را بررسی کن.");
    }
  }
  start();
})();
