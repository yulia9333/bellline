/* =========================================================
   ОРАКУЛ БЕЛЛИН - front-end behaviour
   ========================================================= */

/* -----------------------------------------------------------
   1. НАСТРОЙКИ - заполните перед публикацией
   ----------------------------------------------------------- */
const CONFIG = {
  // Ссылка на вашу платёжную страницу Prodamus.
  // Пример: "https://youproduction.payform.ru"
  PRODAMUS_URL: "https://youproduction.payform.ru",

  // Ссылка на публичную оферту (Prodamus/Taplink и т.п.).
  OFERTA_URL: "https://taplink.cc/youproduction/p/oferta",

  // Передавать ли контактные данные в Prodamus для предзаполнения заказа.
  // false - безопасный вариант по умолчанию: данные вводятся уже на странице Prodamus.
  // true  - e-mail / имя / telegram будут добавлены к ссылке оплаты.
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
     Форма: валидация → Prodamus
     --------------------------------------------------------- */
  var form = document.getElementById("buyForm");
  if (!form) return;

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setState(fieldId, ok) {
    var f = document.getElementById(fieldId);
    if (f) f.classList.toggle("invalid", !ok);
    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var tg = form.telegram.value.trim();
    var agree = form.agree.checked;

    var okEmail = setState("f-email", emailRe.test(email));
    var okTg = setState("f-tg", tg.length >= 2);
    var okAgree = agree;
    document.getElementById("c-privacy").classList.toggle("invalid", !agree);

    if (!okEmail || !okTg || !okAgree) {
      var firstBad = form.querySelector(".invalid input, .consent.invalid input");
      if (firstBad) firstBad.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Переходим к оплате…"; }

    var lead = {
      name: name, email: email, telegram: tg,
      marketing: form.marketing.checked, product: "Оракул Беллин - книга", price: "500 EUR"
    };

    // Необязательно: сохранить заявку до перехода на оплату
    var save = CONFIG.LEAD_ENDPOINT
      ? fetch(CONFIG.LEAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(lead)
        }).catch(function () {})
      : Promise.resolve();

    save.then(function () { goToPayment(lead); });
  });

  function goToPayment(lead) {
    var base = CONFIG.PRODAMUS_URL;
    if (!base || base.indexOf("payform") === -1 && base.indexOf("prodamus") === -1) {
      // Ссылка оплаты ещё не настроена
      alert("Ссылка на оплату ещё не подключена. Укажите PRODAMUS_URL в файле assets/js/main.js.");
      var btn = document.querySelector('#buyForm button[type="submit"]');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Купить книгу за 500&nbsp;€ <span class="arrow" aria-hidden="true">→</span>'; }
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
