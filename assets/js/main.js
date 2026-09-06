/* =========================================================
   ОРАКУЛ БЕЛЛИН - front-end behaviour
   ========================================================= */

/* -----------------------------------------------------------
   1. НАСТРОЙКИ - заполните перед публикацией
   ----------------------------------------------------------- */
const CONFIG = {
  // Ссылка на Telegram-сценарий оформления и оплаты книги.
  CHECKOUT_URL: "https://lcvr.net/Fzq6?utm_source=IG&utm_medium=landing&utm_campaign=belline",

  // Ссылка на публичную оферту на сайте.
  OFERTA_URL: "https://bellline.vercel.app/oferta.html",
  OFFER_VERSION: "belline-book-2026-09-06",

  // Передавать ли контактные данные в сценарий оформления как параметры URL.
  PREFILL_PRODAMUS: false,

  // (необязательно) Endpoint для сохранения заявок, например форма Formspree:
  // "https://formspree.io/f/xxxxxxx". Оставьте пустым, если не используете.
  LEAD_ENDPOINT: ""
};

(function () {
  "use strict";

  /* ---- Текущий год в подвале ---- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Ссылки на оферту ---- */
  document.querySelectorAll("[data-oferta]").forEach(function (a) {
    a.setAttribute("href", CONFIG.OFERTA_URL || "#");
  });

  /* ---- Плавная прокрутка по якорям ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---- Reveal на скролле ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------------------------------------------------------
     Форма: валидация → Telegram-сценарий оформления
     --------------------------------------------------------- */
  var form = document.getElementById("buyForm");
  if (!form) return;
  var fields = form.elements;
  var status = document.getElementById("form-status");
  fields.marketing.addEventListener("change", function () {
    document.getElementById("c-marketing-data").hidden = !fields.marketing.checked;
    if (!fields.marketing.checked) fields.marketingData.checked = false;
  });
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setState(fieldId, ok) {
    var f = document.getElementById(fieldId);
    if (f) f.classList.toggle("invalid", !ok);
    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = fields.name.value.trim();
    var email = fields.email.value.trim();
    var tg = fields.telegram.value.trim();
    var agree = fields.agree.checked;
    var offerAgree = fields.offerAgree.checked;

    var okName = setState("f-name", name.length >= 2);
    var okEmail = setState("f-email", emailRe.test(email));
    var okTg = setState("f-tg", tg.length >= 2);
    var okAgree = agree;
    document.getElementById("c-privacy").classList.toggle("invalid", !agree);
    document.getElementById("c-offer").classList.toggle("invalid", !offerAgree);

    if (!okName || !okEmail || !okTg || !okAgree || !offerAgree) {
      status.textContent = "Заполните имя, e-mail, Telegram и обязательные отметки под формой.";
      var firstBad = form.querySelector(".invalid input, .consent.invalid input");
      if (firstBad) firstBad.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Переходим к оплате…"; }

    var lead = {
      name: name, email: email, telegram: tg,
      marketing: fields.marketing.checked && fields.marketingData.checked,
      marketingMessagesConsent: fields.marketing.checked,
      marketingDataConsent: fields.marketingData.checked,
      offerAccepted: offerAgree, offerVersion: CONFIG.OFFER_VERSION,
      applicationConsent: agree, consentVersion: "belline-consent-2026-09-06",
      marketingVersion: "belline-marketing-2026-09-06",
      marketingDataVersion: "belline-marketing-data-2026-09-06",
      acceptedAt: new Date().toISOString(),
      product: "Руководство по оракулу Беллин", edition: "2026-08-30", price: "48000 RUB"
    };

    // Необязательно: сохранить заявку до перехода на оплату
    var save = CONFIG.LEAD_ENDPOINT
      ? fetch(CONFIG.LEAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(lead)
        }).then(function (response) {
          if (!response.ok) throw new Error("Lead was not saved");
        })
      : Promise.resolve();

    save.then(function () { goToPayment(lead); }).catch(function () {
      status.textContent = "Заявка не сохранилась. Повторите попытку или напишите нам на contact@youproduction.fr.";
      if (btn) { btn.disabled = false; btn.textContent = "Купить книгу за 48 000 ₽"; }
    });
  });

  function goToPayment(lead) {
    var base = CONFIG.CHECKOUT_URL;
    var parsed;
    try { parsed = new URL(base); } catch (_) {}
    if (!parsed || parsed.protocol !== "https:") {
      alert("Ссылка на оформление ещё не подключена.");
      var btn = document.querySelector('#buyForm button[type="submit"]');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Купить книгу за 48&nbsp;000&nbsp;₽ <span class="arrow" aria-hidden="true">→</span>'; }
      return;
    }

    var url = base;
    if (CONFIG.PREFILL_PRODAMUS) {
      var sep = base.indexOf("?") === -1 ? "?" : "&";
      var params = new URLSearchParams({
        email: lead.email,
        customer_extra: "Telegram: " + lead.telegram + (lead.name ? " · " + lead.name : "")
      });
      url = base + sep + params.toString();
    }
    window.location.href = url;
  }
})();
