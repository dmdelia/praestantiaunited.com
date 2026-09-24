function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function markdown(md) {
  let html = escapeHtml(md);
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^\- (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = "<p>" + html + "</p>";
  html = html.replace(/<p>(<h[1-3]>)/g, "$1").replace(/(<\/h[1-3]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1").replace(/(<\/blockquote>)<\/p>/g, "$1");
  return html;
}

function renderHome() {
  const hero = document.getElementById("hero");
  const grid = document.getElementById("editorial-grid");
  const filters = document.getElementById("filters");
  if (!hero || !grid) return;

  const featured = NEWS.find(n => n.is_featured) || NEWS[0];
  hero.style.backgroundImage = `url("${featured.image}")`;
  hero.innerHTML = `
    <div class="hero-content">
      <div class="eyebrow">${escapeHtml(featured.category)}</div>
      <h1>${escapeHtml(featured.title)}</h1>
      <div class="subheadline">${escapeHtml(featured.subheadline)}</div>
      <p class="meta">${escapeHtml(featured.date)}</p>
    </div>`;

  const categories = ["ALL", ...new Set(NEWS.map(n => n.category))];
  filters.innerHTML = categories.map(c =>
    `<button class="filter ${c === "ALL" ? "active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");

  function draw(category = "ALL") {
    const items = NEWS.filter(n => !n.is_featured && (category === "ALL" || n.category === category));
    grid.innerHTML = items.map(n => `
      <a class="card" href="news_article.html?slug=${encodeURIComponent(n.slug)}">
        <div class="card-image" style="background-image:url('${n.image}')"></div>
        <div class="card-content">
          <div class="eyebrow">${escapeHtml(n.category)}</div>
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml(n.subheadline)}</p>
          <div class="meta">${escapeHtml(n.date)}</div>
        </div>
      </a>`).join("");
  }
  draw();
  filters.addEventListener("click", e => {
    if (!e.target.matches(".filter")) return;
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    draw(e.target.dataset.category);
  });

  hero.addEventListener("click", () => {
    location.href = `news_article.html?slug=${encodeURIComponent(featured.slug)}`;
  });
  hero.style.cursor = "pointer";
}

renderHome();
