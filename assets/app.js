(() => {
  const C = window.SHTEGU;
  const $ = (s, el = document) => el.querySelector(s);
  const params = new URLSearchParams(location.search);
  const EMBED = "_embed=wp:featuredmedia,wp:term,author";
  const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];

  // ---------- API ----------
  async function api(path) {
    const res = await fetch(`${C.api}/${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return { data: await res.json(), totalPages: +res.headers.get("X-WP-TotalPages") || 1 };
  }

  let catsPromise;
  function categories() {
    catsPromise ??= api("categories?per_page=100&_fields=id,slug,name").then(r => {
      const bySlug = {}, byId = {};
      r.data.forEach(c => { bySlug[c.slug] = c; byId[c.id] = c; });
      return { bySlug, byId };
    });
    return catsPromise;
  }

  async function posts({ cat, per = 10, page = 1, search } = {}) {
    let q = `posts?per_page=${per}&page=${page}&${EMBED}`;
    if (cat) {
      const c = (await categories()).bySlug[cat];
      if (!c) return { data: [], totalPages: 0 };
      q += `&categories=${c.id}`;
    }
    if (search) q += `&search=${encodeURIComponent(search)}`;
    return api(q);
  }

  // ---------- Helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const text = html => new DOMParser().parseFromString(html || "", "text/html").body.textContent.trim();

  function fmtDate(iso) {
    const d = new Date(iso), now = new Date();
    const mins = Math.round((now - d) / 60000);
    if (mins >= 0 && mins < 60) return `para ${Math.max(mins, 1)} min`;
    if (mins >= 0 && mins < 24 * 60) return `para ${Math.round(mins / 60)} orësh`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function image(p, size = "medium_large") {
    const m = p._embedded?.["wp:featuredmedia"]?.[0];
    if (!m?.source_url) {
      // Pa foto kryesore: merr foton e parë nga teksti i artikullit.
      return (p.content?.rendered || "").match(/<img[^>]+src="([^"]+)"/)?.[1] || null;
    }
    const sizes = m.media_details?.sizes || {};
    const order = size === "thumbnail" ? ["thumbnail", "td_218x150", "medium"] : [size, "large", "medium_large", "td_485x360", "full"];
    return order.map(s => sizes[s]?.source_url).find(Boolean) || m.source_url;
  }

  // Kategoria më specifike e postimit (pa "all" dhe "lajme", që janë të përgjithshme).
  function category(p) {
    const terms = (p._embedded?.["wp:term"]?.[0] || []).filter(t => t.taxonomy === "category");
    return terms.find(t => !["all", "lajme"].includes(t.slug));
  }

  const author = p => p._embedded?.author?.[0]?.name;
  const postUrl = p => `artikulli.html?s=${encodeURIComponent(p.slug)}`;
  const catUrl = slug => `kategoria.html?k=${encodeURIComponent(slug)}`;

  function meta(p, { withCat = true } = {}) {
    const c = category(p), a = author(p);
    return `<div class="meta">${withCat && c ? `<a class="tag" href="${catUrl(c.slug)}">${esc(text(c.name))}</a>` : ""}`
      + `${a ? `<span>${esc(a)}</span>` : ""}<time datetime="${p.date}">${fmtDate(p.date)}</time></div>`;
  }

  function thumb(p, size) {
    const src = image(p, size);
    return `<a class="thumb${src ? "" : " thumb-empty"}" href="${postUrl(p)}" tabindex="-1" aria-hidden="true">`
      + (src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : `<span>SH</span>`) + `</a>`;
  }

  const card = (p, { size = "medium_large", excerpt = false, cls = "" } = {}) => `
    <article class="card ${cls}">
      ${thumb(p, size)}
      <div class="card-body">
        ${meta(p)}
        <h3><a href="${postUrl(p)}">${esc(text(p.title.rendered))}</a></h3>
        ${excerpt ? `<p class="excerpt">${esc(text(p.excerpt.rendered).slice(0, 180))}…</p>` : ""}
      </div>
    </article>`;

  const row = p => `
    <article class="row">
      ${thumb(p, "thumbnail")}
      <div><h4><a href="${postUrl(p)}">${esc(text(p.title.rendered))}</a></h4>${meta(p, { withCat: false })}</div>
    </article>`;

  const errorBox = msg => `<div class="error">${esc(msg)} <button class="btn btn-ghost" onclick="location.reload()">Provo përsëri</button></div>`;

  // Hiq çdo gjë të rrezikshme nga HTML-ja e artikullit.
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, link, meta, object, embed, form").forEach(n => n.remove());
    doc.querySelectorAll("iframe").forEach(f => {
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|www\.facebook\.com)\//.test(f.src)) f.remove();
      else f.setAttribute("loading", "lazy");
    });
    doc.querySelectorAll("*").forEach(n => {
      [...n.attributes].forEach(a => {
        if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
      });
    });
    doc.querySelectorAll("a[href]").forEach(a => {
      // Lidhjet e brendshme drejt artikujve hapen në faqen e re.
      const m = a.href.match(/^https?:\/\/(www\.)?shtegu\.com\/([a-z0-9-]+)\/?$/i);
      if (m) a.href = `artikulli.html?s=${m[2]}`;
      else if (!a.href.startsWith(location.origin)) { a.target = "_blank"; a.rel = "noopener"; }
    });
    doc.querySelectorAll("img").forEach(i => { i.loading = "lazy"; i.decoding = "async"; });
    return doc.body.innerHTML;
  }

  // ---------- Layout ----------
  function header() {
    const today = new Date();
    const days = ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"];
    const current = params.get("k");
    $("#header").innerHTML = `
      <div class="topbar"><div class="wrap">
        <span>${days[today.getDay()]}, ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}</span>
        <nav><a href="artikulli.html?f=kontakti">Kontakti</a><a href="artikulli.html?f=impressum">Impressum</a></nav>
      </div></div>
      <header class="masthead"><div class="wrap">
        <button class="icon-btn menu-btn" aria-label="Menyja" aria-expanded="false" aria-controls="nav">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <a class="logo" href="index.html" aria-label="Shtegu – ballina"><img src="assets/logo.svg" alt="" width="44" height="44"><span>SHTEGU</span></a>
        <form class="search" action="kategoria.html" role="search">
          <input type="search" name="q" placeholder="Kërko lajme…" aria-label="Kërko" value="${esc(params.get("q") || "")}">
          <button aria-label="Kërko"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        </form>
      </div></header>
      <nav class="nav" id="nav"><div class="wrap">
        <a href="index.html"${document.body.dataset.page === "home" ? ' aria-current="page"' : ""}>Ballina</a>
        ${C.nav.map(([slug, name]) => `<a href="${catUrl(slug)}"${slug === current ? ' aria-current="page"' : ""}>${esc(name)}</a>`).join("")}
      </div></nav>`;
    const btn = $(".menu-btn"), nav = $("#nav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  }

  function footer() {
    $("#footer").innerHTML = `
      <footer class="footer"><div class="wrap">
        <div>
          <a class="logo logo-light" href="index.html"><img src="assets/logo.svg" alt="" width="36" height="36"><span>SHTEGU</span></a>
          <p>Portal lajmesh në gjuhën shqipe për shqiptarët në Zvicër, në trojet shqiptare dhe në botë.</p>
        </div>
        <nav>${C.nav.slice(0, 8).map(([slug, name]) => `<a href="${catUrl(slug)}">${esc(name)}</a>`).join("")}</nav>
        <nav><a href="artikulli.html?f=kontakti">Kontakti</a><a href="artikulli.html?f=impressum">Impressum</a><a href="#reklama">Reklamohu</a></nav>
      </div>
      <div class="wrap copy">© ${new Date().getFullYear()} Shtegu.com</div></footer>`;
  }

  async function sidebar() {
    const el = $("#sidebar");
    if (!el) return;
    el.innerHTML = `
      <section class="box"><h2 class="box-title">Më të fundit</h2><div id="latest"><div class="skeleton" style="height:16rem"></div></div></section>
      <section class="box ad" id="reklama">
        <h2 class="box-title">Reklamohu këtu</h2>
        <ul>${C.ads.prices.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${esc(v)}</strong></li>`).join("")}</ul>
        <a class="btn" href="mailto:${esc(C.ads.email)}?subject=${encodeURIComponent("Interesim për marketing")}">Dërgo email</a>
        <a class="btn btn-ghost" href="https://wa.me/${esc(C.ads.whatsapp)}" target="_blank" rel="noopener">Kontakt në WhatsApp</a>
      </section>`;
    try {
      const { data } = await posts({ per: 8 });
      $("#latest").innerHTML = data.map(row).join("");
    } catch { $("#latest").innerHTML = errorBox("Lajmet nuk u ngarkuan."); }
  }

  // ---------- Pages ----------
  async function home() {
    const hero = $("#hero");
    try {
      const { data } = await posts({ per: 5 });
      const [main, ...rest] = data;
      hero.innerHTML = `
        <article class="lead">
          ${thumb(main, "large")}
          <div class="lead-body">${meta(main)}<h1><a href="${postUrl(main)}">${esc(text(main.title.rendered))}</a></h1>
          <p class="excerpt">${esc(text(main.excerpt.rendered).slice(0, 220))}…</p></div>
        </article>
        <div class="hero-side">${rest.map(p => card(p, { cls: "card-sm" })).join("")}</div>`;
    } catch { hero.innerHTML = errorBox("Lajmet nuk u ngarkuan."); }

    const names = Object.fromEntries(C.nav);
    const wrap = $("#sections");
    wrap.innerHTML = C.homeSections.map(slug => `
      <section class="section" id="s-${slug}">
        <div class="section-head"><h2>${esc(names[slug] || slug)}</h2><a href="${catUrl(slug)}">Shih të gjitha →</a></div>
        <div class="section-body"><div class="skeleton" style="height:14rem"></div></div>
      </section>`).join("");
    await Promise.all(C.homeSections.map(async slug => {
      const body = $(`#s-${slug} .section-body`);
      try {
        const { data } = await posts({ cat: slug, per: 4 });
        if (!data.length) return $(`#s-${slug}`).remove();
        const [first, ...rest] = data;
        body.innerHTML = card(first, { excerpt: true, cls: "card-lg" }) + `<div class="rows">${rest.map(row).join("")}</div>`;
      } catch { body.innerHTML = errorBox("Ky seksion nuk u ngarkua."); }
    }));
  }

  async function list() {
    const slug = params.get("k"), q = params.get("q");
    const title = $("#title"), listEl = $("#list"), more = $("#more");
    let label = "Të gjitha lajmet";
    if (q) label = `Rezultatet për „${q}“`;
    else if (slug) {
      const navName = Object.fromEntries(C.nav)[slug];
      label = navName || text((await categories().catch(() => ({ bySlug: {} }))).bySlug[slug]?.name) || slug;
    }
    title.textContent = label;
    document.title = `${label} – Shtegu`;

    let page = 1;
    async function load() {
      more.disabled = true;
      more.textContent = "Duke u ngarkuar…";
      try {
        const { data, totalPages } = await posts({ cat: slug, search: q, per: 12, page });
        if (page === 1 && !data.length) listEl.innerHTML = `<p class="empty">Nuk u gjet asnjë artikull.</p>`;
        listEl.insertAdjacentHTML("beforeend", data.map(p => card(p, { excerpt: true, cls: "card-h" })).join(""));
        more.hidden = page >= totalPages;
        page++;
      } catch { listEl.insertAdjacentHTML("beforeend", errorBox("Artikujt nuk u ngarkuan.")); more.hidden = true; }
      more.disabled = false;
      more.textContent = "Shfaq më shumë";
    }
    more.addEventListener("click", load);
    await load();
  }

  async function article() {
    const el = $("#article");
    const slug = params.get("s"), pageSlug = params.get("f");
    try {
      const path = pageSlug
        ? `pages?slug=${encodeURIComponent(pageSlug)}&${EMBED}`
        : `posts?slug=${encodeURIComponent(slug || "")}&${EMBED}`;
      const { data } = await api(path);
      const p = data[0];
      if (!p) {
        el.innerHTML = `<h1>Faqja nuk u gjet</h1><p>Artikulli mund të jetë hequr ose lidhja është e gabuar.</p><p><a class="btn" href="index.html">Kthehu në ballinë</a></p>`;
        return;
      }
      const t = text(p.title.rendered), img = image(p, "large");
      document.title = `${t} – Shtegu`;
      el.innerHTML = `
        ${pageSlug ? "" : meta(p)}
        <h1>${esc(t)}</h1>
        ${img ? `<figure class="feature"><img src="${esc(img)}" alt=""></figure>` : ""}
        <div class="prose">${sanitize(p.content.rendered)}</div>
        ${pageSlug ? "" : `<div class="share">
          <span>Shpërndaje:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(p.link)}" target="_blank" rel="noopener">Facebook</a>
          <a href="https://wa.me/?text=${encodeURIComponent(t + " " + p.link)}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="linkish" id="copy">Kopjo lidhjen</button>
        </div>`}`;
      $("#copy")?.addEventListener("click", e => {
        navigator.clipboard?.writeText(p.link).then(() => { e.target.textContent = "U kopjua ✓"; });
      });
      const c = category(p);
      if (c && !pageSlug) {
        const { data: rel } = await posts({ cat: c.slug, per: 4 });
        const others = rel.filter(r => r.id !== p.id).slice(0, 3);
        if (others.length) el.insertAdjacentHTML("beforeend", `
          <section class="related"><h2 class="box-title">Lexo edhe</h2><div class="grid3">${others.map(r => card(r)).join("")}</div></section>`);
      }
    } catch { el.innerHTML = errorBox("Artikulli nuk u ngarkua."); }
  }

  header();
  footer();
  sidebar();
  ({ home, list, article })[document.body.dataset.page]?.();
})();
