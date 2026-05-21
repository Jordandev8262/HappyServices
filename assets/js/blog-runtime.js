(() => {
  "use strict";

  const STORAGE_KEY = "hs_blog_articles_v1";

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value ?? "") ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getArticles() {
    const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY), null);
    if (Array.isArray(stored) && stored.length) return stored;

    // Fallback demo content (if admin hasn't created anything yet)
    return [
      {
        id: "demo_1",
        title: "Checklist ultime : préparer un anniversaire sans stress",
        category: "Organisation",
        status: "published",
        date: "2026-05-20",
        image: "assets/img/portfolio/portfolio-1.jpg",
        excerpt: "Les étapes clés (budget, timing, prestataires, animation) pour une journée fluide et mémorable.",
      },
      {
        id: "demo_2",
        title: "5 animations élégantes pour un mariage moderne",
        category: "Mariage",
        status: "published",
        date: "2026-05-20",
        image: "assets/img/portfolio/portfolio-2.jpg",
        excerpt: "Des idées premium, sans “trop”, qui créent de la convivialité et des souvenirs.",
      },
      {
        id: "demo_3",
        title: "Événement d’entreprise : réussir l’expérience invité",
        category: "Entreprise",
        status: "published",
        date: "2026-05-20",
        image: "assets/img/portfolio/portfolio-3.jpg",
        excerpt: "Accueil, déroulé, scénographie, ambiance : les détails qui font vraiment “pro”.",
      },
    ];
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render() {
    const grid = document.getElementById("blogGrid");
    if (!grid) return;

    const articles = getArticles()
      .filter((a) => (a?.status ?? "published") === "published")
      .slice(0, 9);

    grid.innerHTML = articles
      .map((a) => {
        const title = escapeHtml(a.title);
        const category = escapeHtml(a.category);
        const excerpt = escapeHtml(a.excerpt);
        const dateLabel = escapeHtml(formatDate(a.date));
        const img = escapeHtml(a.image || "assets/img/portfolio/portfolio-1.jpg");

        return `
          <div class="col-lg-4">
            <article class="blog-card">
              <div class="blog-media">
                <img src="${img}" alt="${title}" loading="lazy">
              </div>
              <div class="blog-body">
                <div class="blog-meta">
                  <span class="badge blog-badge">${category}</span>
                  <span class="blog-date"><i class="bi bi-calendar3"></i> ${dateLabel}</span>
                </div>
                <h3 class="blog-title">${title}</h3>
                <p class="blog-excerpt">${excerpt}</p>
                <a class="blog-link" href="#contact">Lire l’article <i class="bi bi-arrow-right"></i></a>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  window.addEventListener("load", render);
})();

