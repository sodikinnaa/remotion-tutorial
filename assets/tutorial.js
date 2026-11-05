/* ------------------------------------------------------------------
   Tutorial renderer.
   Reads ?t=<slug> (default: first tutorial in tutorials/index.json),
   fetches tutorials/<slug>/tutorial.json and renders the whole page.
   No build step, no dependencies.
   ------------------------------------------------------------------ */
(async function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);

  // ---------- Theme toggle ----------
  const root = document.documentElement;
  try { const t = localStorage.getItem("theme"); if (t) root.dataset.theme = t; } catch {}
  $("#theme-toggle")?.addEventListener("click", () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (dark ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  });

  // ---------- Load data ----------
  let index;
  try { index = await (await fetch("tutorials/index.json", { cache: "no-cache" })).json(); } catch { index = { site: {}, tutorials: [] }; }
  const slug = params.get("t") || index.tutorials?.[0]?.slug;
  const app = $("#app");
  if (!slug) { app.innerHTML = '<p class="empty">Belum ada tutorial.</p>'; return; }
  const base = `tutorials/${slug}/`;
  let t;
  try {
    const res = await fetch(base + "tutorial.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    t = await res.json();
  } catch (e) {
    app.innerHTML = `<div class="container"><p class="empty">Tutorial <code>${esc(slug)}</code> tidak ditemukan. <a href="./">Kembali ke daftar</a>.</p></div>`;
    return;
  }
  const site = index.site || {};
  document.title = `${t.title} · ${site.name || "Tutorial"}`;
  $("#brand-name").textContent = site.name || "Tutorial";
  if (site.repo) $("#repo-link").href = site.repo;
  const img = (src) => (/^(https?:)?\/\//.test(src) ? src : base + src);

  // Flatten steps for global numbering
  const steps = [];
  (t.sections || []).forEach((sec, si) => (sec.steps || []).forEach((st) => steps.push({ ...st, sec, si, n: steps.length + 1 })));
  const storeKey = `tut:${slug}:done`;
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(storeKey) || "[]")); } catch {}
  const saveDone = () => { try { localStorage.setItem(storeKey, JSON.stringify([...done])); } catch {} };

  // ---------- Render ----------
  const chips = [
    t.level && `<span class="chip accent">Level: ${esc(t.level)}</span>`,
    t.duration && `<span class="chip">⏱ ${esc(t.duration)}</span>`,
    `<span class="chip">${steps.length} langkah</span>`,
    t.updated && `<span class="chip">Diperbarui ${esc(t.updated)}</span>`,
  ].filter(Boolean).join("");

  const titleHtml = (() => {
    // Highlight last two words of the title for a bit of flair
    const words = esc(t.title).split(" ");
    if (words.length < 3) return esc(t.title);
    const tail = words.splice(-2).join(" ");
    return `${words.join(" ")} <span class="hl">${tail}</span>`;
  })();

  const hero = `
    <header class="hero"><div class="container hero-grid">
      <div>
        ${t.eyebrow ? `<p class="eyebrow">${esc(t.eyebrow)}</p>` : ""}
        <h1>${titleHtml}</h1>
        <p class="lead">${esc(t.subtitle || "")}</p>
        <div class="meta">${chips}</div>
        <div class="cta">
          <a class="btn primary" href="#step-1">Mulai tutorial →</a>
          ${t.result ? `<a class="btn" href="#hasil">Lihat hasil akhir</a>` : ""}
          <button class="btn" id="reset-progress" type="button" title="Hapus tanda selesai">Reset progres</button>
        </div>
      </div>
      ${t.hero_image ? `<div class="hero-media"><img src="${img(t.hero_image)}" alt="" loading="eager"></div>` : ""}
    </div></header>`;

  const pipeline = t.pipeline?.length ? `
    <section class="pipeline"><div class="container">
      <h2>Alur produksi</h2>
      <p class="section-sub">${t.pipeline.length} tahap, satu standar produksi.</p>
      <div class="pipe-grid">${t.pipeline.map((p) => `
        <div class="pipe-card"><div class="lbl">${esc(p.label)}</div><div class="nm">${esc(p.name)}</div><div class="ds">${esc(p.desc)}</div></div>`).join("")}
      </div>
    </div></section>` : "";

  const reqs = t.requirements?.length ? `
    <section class="requirements"><div class="container">
      <h2 class="section-title">Yang kamu butuhkan</h2>
      <p class="section-sub">Siapkan ini sebelum mulai.</p>
      <div class="req-grid">${t.requirements.map((r) => `
        <div class="req-item"><div class="ic">${esc(r.name[0])}</div>
          <div><b>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)} ↗</a>` : esc(r.name)}</b><small>${esc(r.note || "")}</small></div></div>`).join("")}
      </div>
    </div></section>` : "";

  const toc = `
    <aside class="toc" aria-label="Daftar isi">
      <h3>Daftar isi</h3>
      <ol>${(t.sections || []).map((s, i) => `
        <li><a href="#${esc(s.id)}" data-sec="${esc(s.id)}"><span class="n">${i + 1}</span><span>${esc(s.title)}</span><span class="cnt">${(s.steps || []).length}</span></a></li>`).join("")}
        ${t.result ? `<li><a href="#hasil"><span class="n">✓</span><span>${esc(t.result.title || "Hasil akhir")}</span></a></li>` : ""}
        ${t.faq?.length ? `<li><a href="#faq"><span class="n">?</span><span>FAQ</span></a></li>` : ""}
      </ol>
    </aside>`;

  const callout = (kind, label, text) => text ? `<div class="callout ${kind}"><span class="ic">${label}</span><div>${text}</div></div>` : "";
  const figure = (f, gi) => `
    <figure><button class="shot" type="button" data-gi="${gi}" aria-label="Perbesar gambar: ${esc(f.caption || "")}">
      <img src="${img(f.src)}" alt="${esc(f.alt || f.caption || "")}" loading="lazy" decoding="async"></button>
      ${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ""}</figure>`;

  const gallery = []; // all figures for the lightbox
  const stepHtml = (st) => {
    const figs = (st.images || []).map((f) => { gallery.push({ ...f, src: img(f.src), n: st.n }); return figure(f, gallery.length - 1); });
    return `
    <article class="step${done.has(st.n) ? " done" : ""}" id="step-${st.n}" data-n="${st.n}">
      <div class="step-head">
        <div class="step-num">${st.n}</div>
        <h3>${esc(st.title)}</h3>
        <label class="done-toggle"><input type="checkbox" ${done.has(st.n) ? "checked" : ""}><span>Tandai selesai</span></label>
      </div>
      <div class="step-body">
        ${st.text ? `<p>${st.text}</p>` : ""}
        ${st.code ? `<pre><code>${esc(st.code)}</code></pre>` : ""}
        ${figs.length ? `<div class="figs${figs.length > 1 ? " two" : ""}">${figs.join("")}</div>` : ""}
        ${callout("tip", "Tips", st.tip)}${callout("note", "Catatan", st.note)}${callout("warning", "Perhatian", st.warning)}
      </div>
    </article>`;
  };

  const sections = (t.sections || []).map((s, i) => `
    <section class="section" id="${esc(s.id)}">
      <div class="section-head">
        <div class="kicker">Bagian ${i + 1} dari ${t.sections.length}</div>
        <h2>${esc(s.title)}</h2>
        ${s.intro ? `<p>${s.intro}</p>` : ""}
      </div>
      ${steps.filter((x) => x.si === i).map(stepHtml).join("")}
    </section>`).join("");

  const result = t.result ? `
    <section class="section" id="hasil"><div class="result">
      <div><h2>${esc(t.result.title || "Hasil akhir")}</h2><p>${t.result.text || ""}</p>
        <a class="btn primary" href="#step-1">Ulangi dari awal</a></div>
      ${t.result.image ? `<img src="${img(t.result.image)}" alt="" loading="lazy">` : ""}
    </div></section>` : "";

  const faq = t.faq?.length ? `
    <section class="section faq" id="faq">
      <div class="section-head"><h2>Pertanyaan umum</h2></div>
      ${t.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join("")}
    </section>` : "";

  app.innerHTML = `
    ${hero}${pipeline}${reqs}
    <div class="container layout">
      ${toc}
      <main>${sections}${result}${faq}
        <div class="stepnav"><a class="btn" href="./">← Semua tutorial</a><a class="btn" href="#top">Ke atas ↑</a></div>
      </main>
    </div>`;

  // ---------- Progress ----------
  const pill = $("#progress-pill");
  const updateProgress = () => {
    const pct = steps.length ? Math.round((done.size / steps.length) * 100) : 0;
    pill.innerHTML = `<span>${done.size}/${steps.length} selesai</span><span class="bar"><i style="width:${pct}%"></i></span>`;
    // Mark TOC sections whose steps are all done
    document.querySelectorAll(".toc a[data-sec]").forEach((a) => {
      const sec = t.sections.find((s) => s.id === a.dataset.sec);
      const ns = steps.filter((s) => s.sec === sec).map((s) => s.n);
      a.classList.toggle("done", ns.length > 0 && ns.every((n) => done.has(n)));
    });
  };
  app.addEventListener("change", (e) => {
    const cb = e.target.closest(".done-toggle input"); if (!cb) return;
    const art = cb.closest(".step"); const n = Number(art.dataset.n);
    cb.checked ? done.add(n) : done.delete(n);
    art.classList.toggle("done", cb.checked); saveDone(); updateProgress();
  });
  $("#reset-progress")?.addEventListener("click", () => {
    done.clear(); saveDone();
    document.querySelectorAll(".step").forEach((a) => { a.classList.remove("done"); a.querySelector("input").checked = false; });
    updateProgress();
  });
  updateProgress();

  // ---------- Scroll progress + active TOC ----------
  const topbar = $("#scroll-progress");
  addEventListener("scroll", () => {
    const h = document.documentElement; const max = h.scrollHeight - h.clientHeight;
    topbar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }, { passive: true });
  const links = [...document.querySelectorAll(".toc a[href^='#']")];
  const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) {
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    } });
  }, { rootMargin: "-20% 0px -70% 0px" });
  targets.forEach((el) => io.observe(el));

  // ---------- Lightbox ----------
  const lb = $("#lightbox"); let gi = 0;
  const show = (i) => {
    gi = (i + gallery.length) % gallery.length; const g = gallery[gi];
    $(".lb-img", lb).src = g.src; $(".lb-img", lb).alt = g.alt || g.caption || "";
    $(".lb-cap", lb).textContent = `Langkah ${g.n} · ${g.caption || ""}`;
    if (!lb.open) lb.showModal();
  };
  app.addEventListener("click", (e) => { const b = e.target.closest("button.shot"); if (b) show(Number(b.dataset.gi)); });
  $(".lb-btn.prev", lb).onclick = () => show(gi - 1);
  $(".lb-btn.next", lb).onclick = () => show(gi + 1);
  $(".lb-close", lb).onclick = () => lb.close();
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(gi - 1); if (e.key === "ArrowRight") show(gi + 1); });

  // Deep link: scroll after render
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); el?.scrollIntoView(); }
})();
