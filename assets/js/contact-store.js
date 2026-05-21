(() => {
  "use strict";

  const STORAGE_KEY = "hs_contacts_v1";

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value ?? "") ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getContacts() {
    return safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  }

  function setContacts(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeStr(v) {
    return String(v ?? "").trim();
  }

  function attach() {
    const form = document.querySelector("form.php-email-form");
    if (!form) return;

    form.addEventListener(
      "submit",
      () => {
        const fd = new FormData(form);
        const item = {
          id: crypto?.randomUUID ? crypto.randomUUID() : `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: nowIso(),
          name: normalizeStr(fd.get("name")),
          email: normalizeStr(fd.get("email")),
          subject: normalizeStr(fd.get("subject")),
          message: normalizeStr(fd.get("message")),
          event_type: normalizeStr(fd.get("event_type")),
          event_date: normalizeStr(fd.get("event_date")),
          page: window.location.pathname,
        };

        const list = getContacts();
        list.unshift(item);
        setContacts(list.slice(0, 500));
      },
      { capture: true }
    );
  }

  window.addEventListener("load", attach);
})();

