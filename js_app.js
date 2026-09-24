const API = "https://praestantia-api.dmdeliafr.workers.dev";

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function formatDate(value) {
  if (!value) return "DATE TBA";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).toUpperCase();
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"}).toUpperCase();
}

function markdown(md="") {
  let html = escapeHtml(md);
  html = html.replace(/^### (.*)$/gm,"<h3>$1</h3>")
             .replace(/^## (.*)$/gm,"<h2>$1</h2>")
             .replace(/^# (.*)$/gm,"<h1>$1</h1>")
             .replace(/^> (.*)$/gm,"<blockquote>$1</blockquote>")
             .replace(/^- (.*)$/gm,"<li>$1</li>")
             .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
             .replace(/\*(.*?)\*/g,"<em>$1</em>");
  html = html.replace(/(?:<li>.*?<\/li>\n?)+/gs, m => "<ul>"+m+"</ul>");
  return html.split(/\n{2,}/).map(block => /^(<h|<blockquote|<ul)/.test(block) ? block : "<p>"+block.replace(/\n/g,"<br>")+"</p>").join("");
}

async function api(path, options={}) {
  const res = await fetch(API + path, options);
  let data;
  try { data = await res.json(); } catch { throw new Error("Invalid API response."); }
  if (!res.ok || data.success === false) throw new Error(data.error || "Request failed.");
  return data;
}

function initNav() {
  const toggle = qs(".nav-toggle");
  const nav = qs(".site-nav");
  if (toggle && nav) toggle.addEventListener("click", () => nav.classList.toggle("open"));
}

async function renderHome() {
  const featuredEl = qs("#featured-news");
  if (!featuredEl) return;
  try {
    const [newsData, matchesData, playersData] = await Promise.all([
      api("/api/news"), api("/api/matches"), api("/api/players")
    ]);
    const news = newsData.articles || [];
    const featured = news.find(x => Number(x.is_featured) === 1) || news[0];
    featuredEl.innerHTML = featured ? `
      <a class="feature-story" href="/news/${encodeURIComponent(featured.slug)}" ${featured.image_url ? `style="background-image:url('${escapeHtml(featured.image_url)}')"` : ""}>
        <div class="feature-overlay"><p class="eyebrow">${escapeHtml(featured.category)}</p><h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.subheadline || "")}</p><span class="meta">${formatDate(featured.published_at || featured.created_at)}</span></div>
      </a>` : '<div class="empty-state large">The newsroom is ready. Publish the first article from Administration.</div>';

    const filters = qs("#filters");
    const grid = qs("#editorial-grid");
    const categories = ["ALL", ...new Set(news.map(n => n.category).filter(Boolean))];
    filters.innerHTML = categories.map((c,i)=>`<button class="filter ${i===0?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
    const draw = category => {
      const items = news.filter(n => (!featured || n.id !== featured.id) && (category==="ALL" || n.category===category));
      grid.innerHTML = items.length ? items.map(n=>`
        <a class="card" href="/news/${encodeURIComponent(n.slug)}">
          <div class="card-image" ${n.image_url?`style="background-image:url('${escapeHtml(n.image_url)}')"`:""}></div>
          <div class="card-content"><p class="eyebrow">${escapeHtml(n.category)}</p><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.subheadline||"")}</p><span class="meta">${formatDate(n.published_at||n.created_at)}</span></div>
        </a>`).join("") : '<div class="empty-state grid-empty">No additional editorials published.</div>';
    };
    draw("ALL");
    filters.addEventListener("click", e => {
      if (!e.target.matches(".filter")) return;
      qsa(".filter").forEach(b=>b.classList.remove("active")); e.target.classList.add("active"); draw(e.target.dataset.category);
    });

    const now = new Date();
    const matches = (matchesData.matches||[]).sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
    const next = matches.find(m=>new Date(m.match_date+"T23:59:59") >= now && m.status !== "completed");
    qs("#next-match").innerHTML = next ? matchMarkup(next, true) : '<div class="empty-state">No scheduled match published.</div>';

    const players = (playersData.players||[]).slice(0,4);
    qs("#player-preview").innerHTML = players.length ? players.map(p=>`<a class="mini-player" href="pantheon.html"><span>${p.player_number ?? "—"}</span><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.position||"MEMBER")}</small></a>`).join("") : '<div class="empty-state">Roster awaiting publication.</div>';
  } catch (err) {
    featuredEl.innerHTML = '<div class="error-state">PRAESTANTIA API is temporarily unavailable.</div>';
    if (qs("#editorial-grid")) qs("#editorial-grid").innerHTML = '<div class="error-state grid-empty">'+escapeHtml(err.message)+'</div>';
  }
}

async function renderArticle() {
  const root = qs("#article"); if (!root) return;

  const params = new URLSearchParams(location.search);
  const queryPreview = params.get("preview");
  const querySlug = params.get("slug");

  const parts = location.pathname.split("/").filter(Boolean);
  const pathPreview = parts[0] === "news" && parts[1] === "preview";
  const pathSlug = pathPreview ? parts[2] : (parts[0] === "news" ? parts[1] : "");

  const isPreview = Boolean(queryPreview) || pathPreview;
  const slug = queryPreview || querySlug || pathSlug;

  if (slug) {
    const cleanPath = isPreview
      ? "/news/preview/" + encodeURIComponent(slug)
      : "/news/" + encodeURIComponent(slug);

    if (location.pathname !== cleanPath) {
      history.replaceState(null, "", cleanPath);
    }
  }

  if (!slug) { root.innerHTML='<div class="error-state">No article selected.</div>'; return; }

  try {
    let data;

    if (isPreview) {
      const token = sessionStorage.getItem("praestantia_admin_token");
      if (!token) throw new Error("Admin session required for draft preview.");

      data = await api("/api/admin/articles/preview/"+encodeURIComponent(slug), {
        headers: { Authorization: "Bearer "+token }
      });
    } else {
      data = await api("/api/news/"+encodeURIComponent(slug));
    }

    const a = data.article;
    document.title = a.title+" — PRAESTANTIA UNITED";
    root.innerHTML = `
      ${isPreview ? '<div class="preview-banner">DRAFT PREVIEW · NOT PUBLIC</div>' : ''}
      <div class="article-kicker"><p class="eyebrow">${escapeHtml(a.category)}</p><span class="meta">${formatDate(a.published_at||a.created_at)}</span></div>
      <h1>${escapeHtml(a.title)}</h1>
      <p class="lead">${escapeHtml(a.subheadline||"")}</p>
      ${a.image_url?`<div class="article-image" style="background-image:url('${escapeHtml(a.image_url)}')"></div>`:""}
      <div class="article-body">${markdown(a.content||"")}</div>`;
  } catch (err) { root.innerHTML='<div class="error-state">'+escapeHtml(err.message)+'</div>'; }
}

async function renderPlayers() {
  const root=qs("#players-grid"); if(!root) return;
  try {
    const {players=[]}=await api("/api/players");
    root.innerHTML = players.length ? players.map(p=>`
      <article class="player-card">
        <div class="player-photo" ${p.portrait_url?`style="background-image:url('${escapeHtml(p.portrait_url)}')"`:""}><span>${p.player_number ?? "—"}</span></div>
        <div class="player-info"><p class="eyebrow">${escapeHtml(p.position||"PANTHEON")}</p><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.nationality||"")}</p>${p.bio?`<p class="muted-copy">${escapeHtml(p.bio)}</p>`:""}</div>
      </article>`).join("") : '<div class="empty-state grid-empty">No active players published yet.</div>';
  } catch(err){root.innerHTML='<div class="error-state grid-empty">'+escapeHtml(err.message)+'</div>';}
}

function matchMarkup(m, compact=false){
  const score = m.score_for != null && m.score_against != null ? `${m.score_for} — ${m.score_against}` : "VS";
  return `<article class="match-card ${compact?"compact-match":""}">
    <div><p class="eyebrow">${escapeHtml(m.competition||"MATCH")}</p><span class="meta">${formatDate(m.match_date)} ${escapeHtml(m.kickoff_time||"")}</span></div>
    <div class="match-pair"><strong>PRAESTANTIA UNITED</strong><span>${score}</span><strong>${escapeHtml(m.opponent)}</strong></div>
    <div class="match-meta"><span>${escapeHtml(m.venue||"VENUE TBA")}</span><span>${escapeHtml((m.status||"scheduled").toUpperCase())}</span></div>
  </article>`;
}

async function renderMatches(){
  const root=qs("#matches-list"); if(!root) return;
  try{
    const {matches=[]}=await api("/api/matches");
    root.innerHTML=matches.length?matches.map(m=>matchMarkup(m)).join(""):'<div class="empty-state">No fixtures or results published yet.</div>';
  }catch(err){root.innerHTML='<div class="error-state">'+escapeHtml(err.message)+'</div>';}
}

async function renderPartners(){
  const root=qs("#partners-grid"); if(!root) return;
  try{
    const {partners=[]}=await api("/api/partners");
    root.innerHTML=partners.length?partners.map(p=>`
      <a class="partner-card" href="${escapeHtml(p.website_url||"#")}" ${p.website_url?'target="_blank" rel="noopener"':""}>
        <span class="eyebrow">${escapeHtml(p.tier||"PARTNER")}</span><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description||"")}</p>
      </a>`).join(""):'<div class="empty-state grid-empty">Partnership roster currently private.</div>';
  }catch(err){root.innerHTML='<div class="error-state grid-empty">'+escapeHtml(err.message)+'</div>';}
}

function formToObject(form){return Object.fromEntries(new FormData(form).entries());}
function wireForm(id,path){
  const form=qs(id); if(!form) return;
  form.addEventListener("submit",async e=>{
    e.preventDefault(); const status=form.querySelector(".form-status"); const button=form.querySelector("button[type=submit]");
    status.textContent="TRANSMITTING…"; button.disabled=true;
    try{
      const body=formToObject(form);
      if(body.age) body.age=Number(body.age);
      await api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      status.textContent="RECEIVED. YOUR REQUEST IS NOW IN REVIEW."; form.reset();
    }catch(err){status.textContent="ERROR: "+err.message;}
    finally{button.disabled=false;}
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  initNav();
  const page=document.body.dataset.page;
  if(page==="home") renderHome();
  if(page==="article") renderArticle();
  if(page==="pantheon") renderPlayers();
  if(page==="matchday") renderMatches();
  if(page==="partners") renderPartners();
  wireForm("#application-form","/api/applications");
  wireForm("#match-request-form","/api/match-requests");
  wireForm("#partnership-form","/api/partnership-requests");
});