(function () {
  var racine = document.documentElement;
  function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrire(cle, val) { try { localStorage.setItem(cle, val); } catch (e) {} }

  // Thème
  var theme = lire("fs-theme");
  if (theme) racine.setAttribute("data-theme", theme);
  var bTheme = document.getElementById("theme");
  if (bTheme) bTheme.addEventListener("click", function () {
    var sombreSys = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var actuel = racine.getAttribute("data-theme") || (sombreSys ? "sombre" : "clair");
    var nouveau = actuel === "sombre" ? "clair" : "sombre";
    racine.setAttribute("data-theme", nouveau);
    ecrire("fs-theme", nouveau);
  });

  // Taille du texte
  var taille = parseInt(lire("fs-taille"), 10) || 19;
  function appliquer() { racine.style.setProperty("--taille", taille + "px"); ecrire("fs-taille", taille); }
  appliquer();
  var bPlus = document.getElementById("plus"), bMoins = document.getElementById("moins");
  if (bPlus) bPlus.addEventListener("click", function () { if (taille < 26) { taille++; appliquer(); } });
  if (bMoins) bMoins.addEventListener("click", function () { if (taille > 15) { taille--; appliquer(); } });

  // Progression et retour en haut
  var barre = document.getElementById("progression"), haut = document.getElementById("haut");
  function defiler() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (barre) barre.style.width = p + "%";
    if (haut) haut.classList.toggle("visible", window.scrollY > 600);
  }
  window.addEventListener("scroll", defiler, { passive: true });
  defiler();
  if (haut) haut.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
})();

// ---------- Sommaire latéral, marque-pages et progression ----------
(function () {
  function lire(c) { try { return localStorage.getItem(c); } catch (e) { return null; } }
  function ecrire(c, v) { try { localStorage.setItem(c, v); } catch (e) {} }
  function effacer(c) { try { localStorage.removeItem(c); } catch (e) {} }

  var lat = document.getElementById("lateral"), voile = document.getElementById("voile");
  var ouvrir = document.getElementById("ouvrir-lat"), fermer = document.getElementById("fermer-lat");
  function ouvre() { lat.classList.add("ouvert"); voile.hidden = false; ouvrir.setAttribute("aria-expanded", "true"); }
  function ferme() { lat.classList.remove("ouvert"); voile.hidden = true; ouvrir.setAttribute("aria-expanded", "false"); }
  if (ouvrir) ouvrir.addEventListener("click", ouvre);
  if (fermer) fermer.addEventListener("click", ferme);
  if (voile) voile.addEventListener("click", ferme);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") ferme(); });
  lat.querySelectorAll(".sous a").forEach(function (a) { a.addEventListener("click", ferme); });

  var main = document.querySelector("main.page");
  var page = main ? main.getAttribute("data-page") : "index.html";
  var chapitres = Array.prototype.map.call(lat.querySelectorAll(".lat-liste > li"), function (li) { return li.getAttribute("data-page"); })
                    .filter(function (p) { return p !== "index.html"; });

  function lus() { try { return JSON.parse(lire("fs-lus") || "{}"); } catch (e) { return {}; } }
  function majProgression() {
    var l = lus(), n = 0;
    lat.querySelectorAll(".lat-liste > li").forEach(function (li) {
      var p = li.getAttribute("data-page");
      var ok = !!l[p]; li.classList.toggle("est-lu", ok); if (ok && p !== "index.html") n++;
    });
    var barre = document.getElementById("lat-prog-barre"), txt = document.getElementById("lat-prog-texte");
    if (barre) barre.style.width = (chapitres.length ? n / chapitres.length * 100 : 0) + "%";
    if (txt) txt.textContent = n === 0 ? "Aucun chapitre lu" : n + " chapitre" + (n > 1 ? "s" : "") + " lu" + (n > 1 ? "s" : "") + " sur " + chapitres.length;
  }
  majProgression();

  // Marque-page : position dans la page courante, et dernière page lue
  var cle = "fs-pos-" + page;
  if (page !== "index.html" && !location.hash) {
    var pos = parseInt(lire(cle), 10);
    if (pos > 0) window.addEventListener("load", function () { window.scrollTo(0, pos); });
  }
  var minuterie;
  window.addEventListener("scroll", function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () {
      if (page === "index.html") return;
      ecrire(cle, String(Math.round(window.scrollY)));
      ecrire("fs-derniere", page);
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0 || window.scrollY / h > 0.9) {
        var l = lus(); if (!l[page]) { l[page] = 1; ecrire("fs-lus", JSON.stringify(l)); majProgression(); }
      }
    }, 250);
  }, { passive: true });

  // Accueil : bouton « Reprendre la lecture »
  var rep = document.getElementById("reprendre"), derniere = lire("fs-derniere");
  if (rep && derniere) {
    var lien = lat.querySelector('li[data-page="' + derniere + '"] .lat-titre');
    var a = document.getElementById("reprendre-lien");
    a.href = derniere; a.textContent = "Reprendre la lecture" + (lien ? " : " + lien.textContent : "");
    rep.hidden = false;
  }

  // Réinitialiser
  var reinit = document.getElementById("reinit");
  if (reinit) reinit.addEventListener("click", function () {
    if (!confirm("Réinitialiser la progression et les marque-pages de lecture ?")) return;
    effacer("fs-lus"); effacer("fs-derniere");
    ["index.html"].concat(chapitres).forEach(function (p) { effacer("fs-pos-" + p); });
    majProgression(); if (rep) rep.hidden = true;
  });

  // Sous-titre visible surligné dans le sommaire
  var liens = lat.querySelectorAll(".sous a");
  if (liens.length && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) liens.forEach(function (a) { a.classList.toggle("visible-ici", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    liens.forEach(function (a) { var t = document.querySelector(a.getAttribute("href")); if (t) obs.observe(t); });
  }
})();
