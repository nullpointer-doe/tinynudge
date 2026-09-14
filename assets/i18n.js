(function () {
  const LANGS = [
    { id: "en", name: "English", dir: "ltr" },
    { id: "de", name: "Deutsch", dir: "ltr" },
    { id: "es", name: "Español", dir: "ltr" },
    { id: "fr", name: "Français", dir: "ltr" },
    { id: "pt", name: "Português", dir: "ltr" },
    { id: "it", name: "Italiano", dir: "ltr" },
    { id: "ru", name: "Русский", dir: "ltr" },
    { id: "zh", name: "中文", dir: "ltr" },
    { id: "ja", name: "日本語", dir: "ltr" },
    { id: "ar", name: "العربية", dir: "rtl" },
  ];
  const FONTS = {
    ar: "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap",
    zh: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap",
    ja: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap",
  };
  const IDS = LANGS.map(function (item) {
    return item.id;
  });

  const script = document.currentScript;
  const assetBase = (script && script.src ? script.src.replace(/i18n\.js(?:\?.*)?$/, "") : "./assets/");

  function metaLang(id) {
    return LANGS.find(function (item) {
      return item.id === id;
    }) || LANGS[0];
  }

  function pickLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("lang") || "").toLowerCase();
    if (IDS.indexOf(fromUrl) !== -1) return fromUrl;
    try {
      const stored = (localStorage.getItem("tinynudge-lang") || "").toLowerCase();
      if (IDS.indexOf(stored) !== -1) return stored;
    } catch (err) {
      /* ignore */
    }
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("zh")) return "zh";
    const short = nav.slice(0, 2);
    if (IDS.indexOf(short) !== -1) return short;
    return "en";
  }

  function t(key) {
    const dict = window.TN.dict || {};
    if (dict[key]) return dict[key];
    const en = window.TN.en || {};
    return en[key] || "";
  }

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      const value = t(key);
      if (!value) return;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = value;
      else el.textContent = value.replace(/&amp;/g, "&").replace(/&nbsp;/g, "\u00a0");
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      const value = t(el.getAttribute("data-i18n-aria"));
      if (value) el.setAttribute("aria-label", value);
    });
    document.querySelectorAll("meta[data-i18n-content]").forEach(function (el) {
      const value = t(el.getAttribute("data-i18n-content"));
      if (value) el.setAttribute("content", value);
    });
    const title = t("meta.title");
    if (title) document.title = title;
    translateChrome();
    markEnglishGuides();
    document.dispatchEvent(new CustomEvent("tn:i18n"));
  }

  function hrefKey(href) {
    if (!href) return "";
    if (href.indexOf("#tool") !== -1) return "nav.tool";
    if (href.indexOf("#faq") !== -1) return "nav.faq";
    if (href.indexOf("privacy") !== -1) return "nav.privacy";
    if (href.indexOf("contact") !== -1) return "nav.contact";
    if (href.indexOf("mac.html") !== -1) return "nav.mac";
    if (href.indexOf("guides") !== -1) return "nav.guides";
    if (href === "./" || href === "../" || href === "../../" || href === "./index.html") return "nav.home";
    return "";
  }

  function markEnglishGuides() {
    const path = window.location.pathname;
    const isGuideArticle = /\/guides\/.+\.html$/.test(path);
    let note = document.getElementById("tn-en-guide");
    if (!isGuideArticle || window.TN.lang === "en") {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement("p");
      note.id = "tn-en-guide";
      note.className = "note";
      const article = document.querySelector(".prose, .section");
      if (article) article.insertBefore(note, article.firstChild);
    }
    note.textContent = t("guides.enNote");
  }

  function translateChrome() {
    document.querySelectorAll(".nav-links a, .footer a").forEach(function (el) {
      if (el.hasAttribute("data-i18n")) return;
      const key = hrefKey(el.getAttribute("href") || "");
      if (key && t(key)) el.textContent = t(key);
    });
    const nav = document.querySelector(".nav-links");
    if (nav && t("nav.primary")) nav.setAttribute("aria-label", t("nav.primary"));
  }

  function loadFont(id) {
    const href = FONTS[id];
    if (!href || document.querySelector('link[data-tn-font="' + id + '"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-tn-font", id);
    document.head.appendChild(link);
  }

  function mountSwitcher(lang) {
    document.querySelectorAll(".nav-links").forEach(function (nav) {
      if (nav.querySelector(".lang-switch")) return;
      const label = document.createElement("label");
      label.className = "lang-switch";
      const select = document.createElement("select");
      select.setAttribute("aria-label", t("lang.label") || "Language");
      LANGS.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        if (item.id === lang) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        setLang(select.value, true);
      });
      label.appendChild(select);
      nav.appendChild(label);
    });
  }

  function setUrlLang(id) {
    const url = new URL(window.location.href);
    if (id === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", id);
    window.history.replaceState({}, "", url);
  }

  async function setLang(id, persist) {
    const info = metaLang(id);
    let dict = window.TN.cache[id];
    if (!dict) {
      const res = await fetch(assetBase + "locales/" + id + ".json");
      dict = await res.json();
      window.TN.cache[id] = dict;
    }
    if (id !== "en" && !window.TN.en) {
      const enRes = await fetch(assetBase + "locales/en.json");
      window.TN.en = await enRes.json();
    }
    if (id === "en") window.TN.en = dict;
    window.TN.dict = dict;
    window.TN.lang = id;
    document.documentElement.lang = id;
    document.documentElement.dir = info.dir;
    loadFont(id);
    if (persist) {
      try {
        localStorage.setItem("tinynudge-lang", id);
      } catch (err) {
        /* ignore */
      }
      setUrlLang(id);
    }
    apply();
    document.querySelectorAll(".lang-switch select").forEach(function (select) {
      select.value = id;
      select.setAttribute("aria-label", t("lang.label") || "Language");
    });
  }

  window.TN = {
    t: t,
    lang: "en",
    dict: {},
    en: null,
    cache: {},
    setLang: setLang,
  };

  const initial = pickLang();
  const ready = fetch(assetBase + "locales/en.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (en) {
      window.TN.en = en;
      window.TN.cache.en = en;
      return setLang(initial, false);
    })
    .then(function () {
      mountSwitcher(window.TN.lang);
    })
    .catch(function () {
      mountSwitcher("en");
    });

  window.TN.ready = ready;

  (function loadAnalytics() {
    var cfg = document.createElement("script");
    cfg.src = assetBase + "site-config.js";
    cfg.onload = function () {
      var an = document.createElement("script");
      an.src = assetBase + "analytics.js";
      document.head.appendChild(an);
    };
    cfg.onerror = function () {
      var an = document.createElement("script");
      an.src = assetBase + "analytics.js";
      document.head.appendChild(an);
    };
    document.head.appendChild(cfg);
  })();
})();
