const content = document.getElementById("content");

document.querySelectorAll(".toolbar button").forEach(button => {
  button.addEventListener("click", () => {
    const start = content.selectionStart;
    const end = content.selectionEnd;
    const selected = content.value.slice(start, end);
    if (button.dataset.wrap) {
      const w = button.dataset.wrap;
      content.setRangeText(`${w}${selected || "text"}${w}`, start, end, "end");
    } else {
      const p = button.dataset.prefix;
      content.setRangeText(p + (selected || "text"), start, end, "end");
    }
    content.focus();
  });
});

document.getElementById("editor-form").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const item = {
    slug,
    title,
    category: document.getElementById("category").value.trim(),
    subheadline: document.getElementById("subheadline").value.trim(),
    date: new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }).toUpperCase(),
    image: document.getElementById("image").value.trim(),
    is_featured: document.getElementById("featured").checked,
    content: content.value
  };
  document.getElementById("output").textContent =
    JSON.stringify(item, null, 2) +
    "\n\nAdd this object to data_news.js inside the NEWS array.";
});
