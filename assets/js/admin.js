(() => {
  "use strict";

  // NOTE: This is a static-site admin (client-side). Credentials are in the code as requested.
  const ADMIN_EMAIL = "happyservices@Admin";
  const ADMIN_PASSWORD = "HappyServices2026";

  const AUTH_SESSION_KEY = "hs_admin_authed_v1";
  const AUTH_REMEMBER_KEY = "hs_admin_remember_v1";

  const BLOG_KEY = "hs_blog_articles_v1";
  const CONTACTS_KEY = "hs_contacts_v1";

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxO5-yV6cBn6RZ2VHKme-SIOX2aB0WNGm_FabiDqMooZh1VXOqxP_18JPA4kuRQkRCsWw/exec";

  let remoteContacts = [];
  let isFetchingContacts = false;
  let hasFetchedRemote = false;
  let currentContactId = null; // New
  let pollingInterval = null; // New

  const els = {
    loginView: document.getElementById("loginView"),
    dashboardView: document.getElementById("dashboardView"),
    loginForm: document.getElementById("loginForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    loginError: document.getElementById("loginError"),
    rememberMe: document.getElementById("rememberMe"),
    togglePwd: document.getElementById("togglePwd"),

    logoutBtn: document.getElementById("logoutBtn"),
    seedDemo: document.getElementById("seedDemo"),

    navItems: Array.from(document.querySelectorAll(".hs-navitem[data-view]")),
    blogPanel: document.getElementById("blogPanel"),
    contactsPanel: document.getElementById("contactsPanel"),

    viewTitle: document.getElementById("viewTitle"),
    breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
    pageHeading: document.getElementById("pageHeading"),
    pageDesc: document.getElementById("pageDesc"),
    todayLabel: document.getElementById("todayLabel"),
    articleResultCount: document.getElementById("articleResultCount"),
    contactResultCount: document.getElementById("contactResultCount"),
    dashboardMain: document.getElementById("dashboardMain"),

    // Blog
    kpiTotalArticles: document.getElementById("kpiTotalArticles"),
    kpiPublishedArticles: document.getElementById("kpiPublishedArticles"),
    kpiDraftArticles: document.getElementById("kpiDraftArticles"),
    newArticleBtn: document.getElementById("newArticleBtn"),
    articleSearch: document.getElementById("articleSearch"),
    articleFilter: document.getElementById("articleFilter"),
    articlesTbody: document.getElementById("articlesTbody"),

    // Article modal
    articleModalEl: document.getElementById("articleModal"),
    articleModalTitle: document.getElementById("articleModalTitle"),
    articleForm: document.getElementById("articleForm"),
    saveArticleBtn: document.getElementById("saveArticleBtn"),
    articleId: document.getElementById("articleId"),
    articleTitle: document.getElementById("articleTitle"),
    articleStatus: document.getElementById("articleStatus"),
    articleCategory: document.getElementById("articleCategory"),
    articleDate: document.getElementById("articleDate"),
    articleImage: document.getElementById("articleImage"),
    articleImageFile: document.getElementById("articleImageFile"),
    imagePreviewContainer: document.getElementById("imagePreviewContainer"),
    imagePreview: document.getElementById("imagePreview"),
    removeImageBtn: document.getElementById("removeImageBtn"),
    articleExcerpt: document.getElementById("articleExcerpt"),
    articleContent: document.getElementById("articleContent"),

    // Contacts
    kpiContacts: document.getElementById("kpiContacts"),
    kpiContactsToday: document.getElementById("kpiContactsToday"),
    kpiContacts7d: document.getElementById("kpiContacts7d"),
    contactSearch: document.getElementById("contactSearch"),
    contactsTbody: document.getElementById("contactsTbody"),
    syncContacts: document.getElementById("syncContacts"),
    exportContacts: document.getElementById("exportContacts"),
    clearContacts: document.getElementById("clearContacts"),

    contactModalEl: document.getElementById("contactModal"),
    contactDetails: document.getElementById("contactDetails"),
    contactStatusSelect: document.getElementById("contactStatusSelect"),
  };

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value ?? "") ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getBlogArticles() {
    const list = safeJsonParse(localStorage.getItem(BLOG_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function setBlogArticles(items) {
    localStorage.setItem(BLOG_KEY, JSON.stringify(items));
  }

  function getContacts() {
    if (hasFetchedRemote) return remoteContacts;
    const list = safeJsonParse(localStorage.getItem(CONTACTS_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  async function fetchContactsFromSheets(silent = false) {
    if (isFetchingContacts) return;
    isFetchingContacts = true;
    if (!silent && els.syncContacts) {
      els.syncContacts.disabled = true;
      els.syncContacts.innerHTML = '<i class="bi bi-arrow-repeat hs-spin"></i> Chargement...';
    }

    try {
      const resp = await fetch(SCRIPT_URL);
      if (!resp.ok) throw new Error("Erreur réseau");
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      remoteContacts = Array.isArray(data) ? data : [];
      hasFetchedRemote = true;
      renderContacts();
    } catch (err) {
      console.error("Fetch error:", err);
      if (!silent) {
        alert("Impossible de récupérer les contacts depuis Google Sheets. Vérifie ta connexion ou le déploiement du script.");
      }
    } finally {
      isFetchingContacts = false;
      if (!silent && els.syncContacts) {
        els.syncContacts.disabled = false;
        els.syncContacts.innerHTML = '<i class="bi bi-arrow-repeat"></i> Actualiser Sheets';
      }
    }
  }

  function startPolling() {
    if (pollingInterval) return;
    // Polling toutes les 30 secondes pour le "temps réel"
    pollingInterval = setInterval(() => {
      fetchContactsFromSheets(true);
    }, 30000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  async function clearContactsFromSheets() {
    if (!confirm("Vider la liste des messages ? Cela supprimera aussi les données dans Google Sheets.")) return;

    const originalBtnHtml = els.clearContacts.innerHTML;
    els.clearContacts.disabled = true;
    els.clearContacts.innerHTML = '<i class="bi bi-hourglass-split"></i> Nettoyage...';

    try {
      // Pour Google Apps Script, on utilise souvent FormData pour le POST
      const fd = new FormData();
      fd.append("action", "clear");

      const resp = await fetch(SCRIPT_URL, {
        method: "POST",
        body: fd,
        mode: "no-cors", // Mode nécessaire pour GAS sans redirection complexe
      });

      // Avec no-cors, on ne peut pas lire la réponse, mais on assume que c'est ok si pas d'erreur réseau
      localStorage.removeItem(CONTACTS_KEY);
      remoteContacts = [];
      hasFetchedRemote = true;
      renderContacts();
      alert("La liste a été vidée (Local et Google Sheets).");
    } catch (err) {
      console.error("Clear error:", err);
      alert("Erreur lors de la suppression sur Google Sheets.");
    } finally {
      els.clearContacts.disabled = false;
      els.clearContacts.innerHTML = originalBtnHtml;
    }
  }

  function nowDateInputValue() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function showError(message) {
    els.loginError.textContent = message;
    els.loginError.style.display = "block";
  }

  function clearError() {
    els.loginError.textContent = "";
    els.loginError.style.display = "none";
  }

  function isAuthed() {
    const session = sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
    const remembered = localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
    return session || remembered;
  }

  function setAuthed(remember) {
    sessionStorage.setItem(AUTH_SESSION_KEY, "1");
    if (remember) localStorage.setItem(AUTH_REMEMBER_KEY, "1");
    else localStorage.removeItem(AUTH_REMEMBER_KEY);
  }

  function clearAuthed() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
  }

  function updateTodayLabel() {
    if (!els.todayLabel) return;
    const d = new Date();
    els.todayLabel.textContent = d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function setView(view) {
    const isBlog = view === "blog";
    els.navItems.forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
    });

    els.blogPanel.classList.toggle("d-none", !isBlog);
    els.contactsPanel.classList.toggle("d-none", isBlog);

    els.viewTitle.textContent = isBlog ? "Articles" : "Messages";
    els.breadcrumbCurrent.textContent = isBlog ? "Blog" : "Contacts";

    els.pageHeading.textContent = isBlog ? "Articles du blog" : "Demandes entrantes";
    els.pageDesc.textContent = isBlog
      ? "Publie et pilote tes contenus : statut visible d’un coup d’œil, actions contextualisées sur chaque ligne."
      : "Centralise les demandes du formulaire : consulte rapidement le contexte, puis exporte pour archivage.";

    if (!isBlog) {
      fetchContactsFromSheets();
    }
  }

  function fmtDate(iso) {
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

  function buildStatusPill(status) {
    const s = (status ?? "published").toLowerCase() === "draft" ? "draft" : "published";
    const label = s === "draft" ? "Brouillon" : "Publié";
    const icon = s === "draft" ? "bi-pencil" : "bi-check2-circle";
    return `<span class="hs-pill ${s}"><i class="bi ${icon}"></i> ${label}</span>`;
  }

  function buildContactStatusPill(status) {
    const s = (status ?? "Nouveau").toLowerCase();
    let cls = "published";
    let icon = "bi-check-circle";

    if (s === "nouveau") {
      cls = "draft";
      icon = "bi-star-fill";
    } else if (s === "en cours") {
      cls = "published";
      icon = "bi-hourglass-split";
    } else if (s === "terminé") {
      cls = "published";
      icon = "bi-check-all";
    } else if (s === "annulé") {
      cls = "draft";
      icon = "bi-x-circle";
    }

    return `<span class="hs-pill ${cls}"><i class="bi ${icon}"></i> ${status ?? "Nouveau"}</span>`;
  }

  function updateImagePreview(src) {
    if (src) {
      els.imagePreview.src = src;
      els.imagePreviewContainer.style.display = "flex";
      els.imagePreviewContainer.style.alignItems = "center";
      els.articleImage.value = src;
    } else {
      els.imagePreview.src = "";
      els.imagePreviewContainer.style.display = "none";
      els.articleImage.value = "";
    }
  }

  function handleImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      updateImagePreview(base64);
    };
    reader.readAsDataURL(file);
  }

  function openArticleModal(mode, article) {
    const modal = bootstrap.Modal.getOrCreateInstance(els.articleModalEl);
    els.articleModalTitle.textContent = mode === "edit" ? "Modifier l’article" : "Nouvel article";

    els.articleId.value = article?.id ?? "";
    els.articleTitle.value = article?.title ?? "";
    els.articleStatus.value = article?.status ?? "published";
    els.articleCategory.value = article?.category ?? "Organisation";
    els.articleDate.value = article?.date ?? nowDateInputValue();
    
    const img = article?.image ?? "assets/img/portfolio/portfolio-1.jpg";
    els.articleImage.value = img;
    updateImagePreview(img);
    els.articleImageFile.value = ""; // Reset file input

    els.articleExcerpt.value = article?.excerpt ?? "";
    els.articleContent.value = article?.content ?? "";

    modal.show();
  }

  function readArticleForm() {
    const id =
      els.articleId.value?.trim() ||
      (crypto?.randomUUID ? crypto.randomUUID() : `a_${Date.now()}_${Math.random().toString(16).slice(2)}`);

    return {
      id,
      title: els.articleTitle.value.trim(),
      status: els.articleStatus.value,
      category: els.articleCategory.value.trim(),
      date: els.articleDate.value,
      image: els.articleImage.value.trim(),
      excerpt: els.articleExcerpt.value.trim(),
      content: els.articleContent.value.trim(),
      updatedAt: new Date().toISOString(),
    };
  }

  function upsertArticle(article) {
    const list = getBlogArticles();
    const idx = list.findIndex((a) => a.id === article.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...article };
    else list.unshift(article);
    setBlogArticles(list.slice(0, 200));
  }

  function deleteArticle(id) {
    const list = getBlogArticles().filter((a) => a.id !== id);
    setBlogArticles(list);
  }

  function matchesQuery(article, q) {
    if (!q) return true;
    const hay = `${article.title ?? ""} ${article.category ?? ""} ${article.excerpt ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function renderBlog() {
    const list = getBlogArticles();
    const q = els.articleSearch.value.trim();
    const filter = els.articleFilter.value;

    const filtered = list.filter((a) => {
      const st = (a.status ?? "published") === "draft" ? "draft" : "published";
      if (filter === "published" && st !== "published") return false;
      if (filter === "draft" && st !== "draft") return false;
      return matchesQuery(a, q);
    });

    const total = list.length;
    const published = list.filter((a) => (a.status ?? "published") !== "draft").length;
    const drafts = total - published;

    els.kpiTotalArticles.textContent = String(total);
    els.kpiPublishedArticles.textContent = String(published);
    els.kpiDraftArticles.textContent = String(drafts);

    if (els.articleResultCount) {
      if (!list.length) {
        els.articleResultCount.textContent = "";
      } else if (!filtered.length) {
        els.articleResultCount.textContent = `0 résultat sur ${list.length}`;
      } else if (filtered.length === list.length) {
        els.articleResultCount.textContent = `${filtered.length} article${filtered.length > 1 ? "s" : ""}`;
      } else {
        els.articleResultCount.textContent = `${filtered.length} / ${list.length} affiché${filtered.length > 1 ? "s" : ""}`;
      }
    }

    if (!filtered.length) {
      els.articlesTbody.innerHTML = `
        <tr>
          <td colspan="5" class="hs-empty">
            <div class="hs-empty-inner">
              <div class="hs-empty-icon"><i class="bi bi-newspaper" aria-hidden="true"></i></div>
              <div class="hs-empty-title">Aucun article à afficher</div>
              <div class="hs-empty-text">${list.length ? "Affine ta recherche ou change le filtre de statut." : "Ajoute ton premier article pour alimenter le blog sur la page publique."}</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    els.articlesTbody.innerHTML = filtered
      .map((a) => {
        const title = escapeHtml(a.title);
        const cat = escapeHtml(a.category);
        const date = escapeHtml(fmtDate(a.date));
        const pill = buildStatusPill(a.status);

        return `
          <tr>
            <td>
              <div class="hs-cell-title">${title}</div>
              ${a.excerpt ? `<div class="hs-cell-sub">${escapeHtml(String(a.excerpt).slice(0, 140))}${String(a.excerpt).length > 140 ? "…" : ""}</div>` : ""}
            </td>
            <td>${cat}</td>
            <td>${pill}</td>
            <td>${date}</td>
            <td class="text-end">
              <div class="hs-actions">
                <button type="button" class="hs-iconbtn" data-action="edit" data-id="${escapeHtml(a.id)}" title="Modifier" aria-label="Modifier ${title}">
                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                </button>
                <button type="button" class="hs-iconbtn" data-action="delete" data-id="${escapeHtml(a.id)}" title="Supprimer" aria-label="Supprimer ${title}">
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function withinDays(iso, days) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = Date.now();
    return now - d.getTime() <= days * 24 * 60 * 60 * 1000;
  }

  function isToday(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function renderContacts() {
    const list = getContacts();
    const q = els.contactSearch.value.trim().toLowerCase();
    const filtered = list.filter((c) => {
      if (!q) return true;
      const hay = `${c.name ?? ""} ${c.email ?? ""} ${c.subject ?? ""} ${c.message ?? ""} ${c.event_type ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

    els.kpiContacts.textContent = String(list.length);
    els.kpiContactsToday.textContent = String(list.filter((c) => isToday(c.createdAt)).length);
    els.kpiContacts7d.textContent = String(list.filter((c) => withinDays(c.createdAt, 7)).length);

    if (els.contactResultCount) {
      if (!list.length) {
        els.contactResultCount.textContent = "";
      } else if (!filtered.length) {
        els.contactResultCount.textContent = `0 résultat sur ${list.length}`;
      } else if (filtered.length === list.length) {
        els.contactResultCount.textContent = `${filtered.length} message${filtered.length > 1 ? "s" : ""}`;
      } else {
        els.contactResultCount.textContent = `${filtered.length} / ${list.length} affiché${filtered.length > 1 ? "s" : ""}`;
      }
    }

    if (!filtered.length) {
      els.contactsTbody.innerHTML = `
        <tr>
          <td colspan="6" class="hs-empty">
            <div class="hs-empty-inner">
              <div class="hs-empty-icon"><i class="bi bi-inbox" aria-hidden="true"></i></div>
              <div class="hs-empty-title">${list.length ? "Aucun message ne correspond" : "Aucun message reçu"}</div>
              <div class="hs-empty-text">${list.length ? "Essaie d’élargir ta recherche (nom, email ou objet)." : "Les dépôts du formulaire de contact du site apparaîtront ici automatiquement."}</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    els.contactsTbody.innerHTML = filtered
      .slice(0, 500)
      .map((c) => {
        const name = escapeHtml(c.name);
        const email = escapeHtml(c.email);
        const type = escapeHtml(c.event_type || "—");
        const statusPill = buildContactStatusPill(c.status);
        const created = escapeHtml(fmtDate(c.createdAt));
        const subject = escapeHtml(c.subject || "—");
        return `
          <tr>
            <td><span class="hs-cell-title">${name}</span></td>
            <td><a href="mailto:${email}">${email}</a></td>
            <td>${type}</td>
            <td>${statusPill}</td>
            <td>${created}</td>
            <td><span class="hs-cell-sub">${subject}</span></td>
            <td class="text-end">
              <button type="button" class="hs-iconbtn" data-action="openContact" data-id="${escapeHtml(c.id)}" title="Voir le détail" aria-label="Voir le message de ${name}">
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function openContactModal(id) {
    const list = getContacts();
    const c = list.find((x) => x.id === id);
    if (!c) return;

    currentContactId = id;
    if (els.contactStatusSelect) {
      els.contactStatusSelect.value = c.status || "Nouveau";
    }

    const html = `
      <div class="hs-contact-box">
        <div class="hs-contact-title">${escapeHtml(c.subject || "Message")}</div>
        <div class="hs-contact-line"><span>Nom</span><span>${escapeHtml(c.name || "—")}</span></div>
        <div class="hs-contact-line"><span>Email</span><span>${escapeHtml(c.email || "—")}</span></div>
        <div class="hs-contact-line"><span>Type</span><span>${escapeHtml(c.event_type || "—")}</span></div>
        <div class="hs-contact-line"><span>Date</span><span>${escapeHtml(c.event_date || "—")}</span></div>
        <div class="hs-contact-line"><span>Reçu le</span><span>${escapeHtml(fmtDate(c.createdAt))}</span></div>
      </div>
      <div class="hs-contact-box">
        <div class="hs-contact-title">Détails</div>
        <div style="white-space: pre-wrap; font-weight: 650; color: rgba(10,9,15,0.78);">${escapeHtml(c.message || "")}</div>
      </div>
    `;

    els.contactDetails.innerHTML = html;
    bootstrap.Modal.getOrCreateInstance(els.contactModalEl).show();
  }

  async function updateContactStatus(id, newStatus) {
    const list = getContacts();
    const contact = list.find((c) => c.id === id);
    if (!contact || !contact.rowIndex) return;

    try {
      const fd = new FormData();
      fd.append("action", "updateStatus");
      fd.append("rowIndex", contact.rowIndex);
      fd.append("status", newStatus);

      // We use fetch with POST. 
      // Note: GAS might have CORS issues with "no-cors", but we'll try.
      // Since we want to update the local state immediately for "real-time" feel:
      contact.status = newStatus;
      renderContacts();

      await fetch(SCRIPT_URL, {
        method: "POST",
        body: fd,
        mode: "no-cors",
      });
      
      console.log("Status updated on Sheets");
    } catch (err) {
      console.error("Update status error:", err);
      alert("Erreur lors de la mise à jour du statut sur Google Sheets.");
    }
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function seedDemoArticles() {
    const base = [
      {
        title: "Checklist ultime : préparer un anniversaire sans stress",
        category: "Organisation",
        status: "published",
        date: nowDateInputValue(),
        image: "assets/img/portfolio/portfolio-1.jpg",
        excerpt: "Les étapes clés (budget, timing, prestataires, animation) pour une journée fluide et mémorable.",
        content: "",
      },
      {
        title: "5 animations élégantes pour un mariage moderne",
        category: "Mariage",
        status: "published",
        date: nowDateInputValue(),
        image: "assets/img/portfolio/portfolio-2.jpg",
        excerpt: "Des idées premium, sans “trop”, qui créent de la convivialité et des souvenirs.",
        content: "",
      },
      {
        title: "Événement d’entreprise : réussir l’expérience invité",
        category: "Entreprise",
        status: "draft",
        date: nowDateInputValue(),
        image: "assets/img/portfolio/portfolio-3.jpg",
        excerpt: "Accueil, déroulé, scénographie, ambiance : les détails qui font vraiment “pro”.",
        content: "",
      },
    ];

    const items = base.map((a) => ({
      id: crypto?.randomUUID ? crypto.randomUUID() : `demo_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...a,
      updatedAt: new Date().toISOString(),
    }));

    setBlogArticles(items);
    renderBlog();
  }

  function showDashboard() {
    els.loginView.classList.add("d-none");
    els.dashboardView.classList.remove("d-none");
    updateTodayLabel();
    setView("blog");
    renderBlog();
    renderContacts();
    startPolling(); // New
    requestAnimationFrame(() => {
      els.dashboardMain?.focus({ preventScroll: true });
    });
  }
  function showLogin() {
    stopPolling(); // New
    els.dashboardView.classList.add("d-none");
    els.loginView.classList.remove("d-none");
  }

  function attach() {
    if (els.togglePwd) {
      els.togglePwd.addEventListener("click", () => {
        const isPwd = els.loginPassword.type === "password";
        els.loginPassword.type = isPwd ? "text" : "password";
        els.togglePwd.querySelector("i").className = `bi ${isPwd ? "bi-eye-slash" : "bi-eye"}`;
      });
    }

    els.loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      clearError();

      const email = els.loginEmail.value.trim();
      const password = els.loginPassword.value;

      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        showError("Identifiants incorrects. Vérifie l’email et le mot de passe.");
        return;
      }

      setAuthed(Boolean(els.rememberMe.checked));
      showDashboard();
    });

    els.logoutBtn?.addEventListener("click", () => {
      clearAuthed();
      showLogin();
    });

    els.navItems.forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    els.newArticleBtn?.addEventListener("click", () => openArticleModal("new"));

    els.articleImageFile?.addEventListener("change", handleImageSelection);
    els.removeImageBtn?.addEventListener("click", () => {
      els.articleImageFile.value = "";
      updateImagePreview("");
    });

    els.saveArticleBtn?.addEventListener("click", () => {
      if (!els.articleForm.reportValidity()) return;
      const article = readArticleForm();
      upsertArticle(article);
      renderBlog();
      bootstrap.Modal.getOrCreateInstance(els.articleModalEl).hide();
    });

    els.seedDemo?.addEventListener("click", seedDemoArticles);

    els.articleSearch?.addEventListener("input", renderBlog);
    els.articleFilter?.addEventListener("change", renderBlog);
    els.contactSearch?.addEventListener("input", renderContacts);

    els.articlesTbody?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === "edit") {
        const a = getBlogArticles().find((x) => x.id === id);
        openArticleModal("edit", a);
      }

      if (action === "delete") {
        const ok = confirm("Supprimer cet article ? Cette action est définitive (stockage local).");
        if (!ok) return;
        deleteArticle(id);
        renderBlog();
      }
    });

    els.contactsTbody?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.dataset.action !== "openContact") return;
      openContactModal(btn.dataset.id);
    });

    els.exportContacts?.addEventListener("click", () => {
      const data = getContacts();
      downloadJson(`happyservices-contacts-${new Date().toISOString().slice(0, 10)}.json`, data);
    });

    els.syncContacts?.addEventListener("click", () => fetchContactsFromSheets());

    els.clearContacts?.addEventListener("click", clearContactsFromSheets);

    els.contactStatusSelect?.addEventListener("change", (e) => {
      if (currentContactId) {
        updateContactStatus(currentContactId, e.target.value);
      }
    });

    // Boot
    if (isAuthed()) showDashboard();
    else showLogin();
  }

  window.addEventListener("load", attach);
})();

