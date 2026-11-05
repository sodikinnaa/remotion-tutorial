/* Index page: lists every tutorial registered in tutorials/index.json. */
(async function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const root = document.documentElement;
  try { const t = localStorage.getItem("theme"); if (t) root.dataset.theme = t; } catch {}
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (dark ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  });

  const cards = document.getElementById("cards");
  let index;
  try { index = await (await fetch("tutorials/index.json", { cache: "no-cache" })).json(); }
  catch { cards.innerHTML = '<p class="empty">Gagal memuat daftar tutorial.</p>'; return; }

  const site = index.site || {};
  if (site.name) { document.title = site.name; document.getElementById("brand-name").textContent = site.name; }
  if (site.description) document.getElementById("site-desc").textContent = site.description;
  if (site.repo) document.getElementById("repo-link").href = site.repo;

  const list = index.tutorials || [];
  if (!list.length) { cards.innerHTML = '<p class="empty">Belum ada tutorial. Tambahkan di tutorials/index.json.</p>'; return; }

  // Count steps live from each tutorial.json so the card never goes stale.
  const counts = await Promise.all(list.map(async (t) => {
    try {
      const d = await (await fetch(`tutorials/${t.slug}/tutorial.json`, { cache: "no-cache" })).json();
      return (d.sections || []).reduce((n, s) => n + (s.steps || []).length, 0);
    } catch { return t.steps || 0; }
  }));

  cards.innerHTML = list.map((t, i) => {
    let doneCount = 0;
    try { doneCount = JSON.parse(localStorage.getItem(`tut:${t.slug}:done`) || "[]").length; } catch {}
    const total = counts[i];
    const cover = t.cover ? (/^(https?:)?\/\//.test(t.cover) ? t.cover : `tutorials/${t.slug}/${t.cover}`) : "";
    return `
      <a class="card" href="tutorial.html?t=${encodeURIComponent(t.slug)}">
        ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : ""}
        <div class="body">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.summary || "")}</p>
          <div class="meta">
            ${t.level ? `<span class="chip accent">${esc(t.level)}</span>` : ""}
            ${t.duration ? `<span class="chip">⏱ ${esc(t.duration)}</span>` : ""}
            <span class="chip">${total} langkah</span>
            ${doneCount ? `<span class="chip">${doneCount}/${total} selesai</span>` : ""}
          </div>
        </div>
      </a>`;
  }).join("");
})();
