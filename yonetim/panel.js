/* ============================================================
   Abonelik Yönetim Paneli — Hüseyin Abi
   - Kodlar internetsiz üretilir (../lisans/cekirdek.js)
   - Uygulama gizli anahtarları kasa.js içinde şifreli durur
   - Müşteri / ödeme kayıtları bu cihazın tarayıcı hafızasında
   ============================================================ */
(function () {
  "use strict";
  var C = window.LisansCekirdek;
  var UYG = {
    KP: { ad: "Kepçe", renk: "#f97316" },
    MZ: { ad: "Macar Zeka", renk: "#10b981" },
    MT: { ad: "Macar Talimat", renk: "#22c55e" }
  };
  var AY = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  var AY_K = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  var VERI_ANAHTAR = "abonelik_panel_veri_v1";
  var HATIRLA_ANAHTAR = "abonelik_panel_hatirla";
  var KASA_ANAHTAR = "abonelik_panel_kasa";

  var gizliler = null;
  var veri = null;
  var gorunum = { sayfa: "genel", filtre: "hepsi", uyg: "", arama: "", odemeAy: "" };

  /* ---------- yardımcılar ---------- */
  function $(s, k) { return (k || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function bugun() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function buAy() { return bugun().slice(0, 7); }
  function ayEkle(a, n) { var p = a.split("-"); return C.ayAnahtar(+p[0], +p[1] - 1 + n); }
  function ayAdi(a) { var p = a.split("-"); return AY[+p[1] - 1] + " " + p[0]; }
  function ayKisa(a) { var p = a.split("-"); return AY_K[+p[1] - 1] + " " + p[0].slice(2); }
  function trTarih(t) { if (!t) return "—"; var p = t.slice(0, 10).split("-"); return p[2] + "." + p[1] + "." + p[0]; }
  function para(n) { return (Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " ₺"; }
  function bashar(ad) { var p = String(ad || "?").trim().split(/\s+/); return ((p[0] || "?")[0] + ((p[1] || "")[0] || "")).toLocaleUpperCase("tr"); }
  function norm(s) { return String(s || "").toLocaleLowerCase("tr").replace(/[ıİşğüöç]/g, function (c) { return { "ı": "i", "İ": "i", "ş": "s", "ğ": "g", "ü": "u", "ö": "o", "ç": "c" }[c]; }); }
  function toast(m) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = m;
    $("#toastKok").appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function kopyala(metin) {
    function eski() {
      var ta = document.createElement("textarea"); ta.value = metin; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).catch(eski); else eski();
    toast("Kopyalandı");
  }
  function b64(buf) { var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function b64c(s) { var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }

  /* ---------- kasa (şifreli anahtarlar) ---------- */
  function kasaAl() {
    try { var k = JSON.parse(localStorage.getItem(KASA_ANAHTAR) || "null"); if (k && k.veri) return k; } catch (e) {}
    return window.ABONELIK_KASA;
  }
  function anahtarTuret(sifre, tuz, tur) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(sifre), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: tuz, iterations: tur, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function kasaAc(sifre) {
    var k = kasaAl();
    if (!k) return Promise.reject(new Error("Kasa dosyası bulunamadı"));
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error("Bu tarayıcı şifre çözmeyi desteklemiyor. Panel adresini https ile açın."));
    return anahtarTuret(sifre, b64c(k.tuz), k.tur).then(function (ak) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64c(k.iv) }, ak, b64c(k.veri));
    }).then(function (duz) { return JSON.parse(new TextDecoder().decode(duz)); });
  }
  function kasaKilitle(sifre, icerik) {
    var tuz = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), tur = 310000;
    return anahtarTuret(sifre, tuz, tur).then(function (ak) {
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, ak, new TextEncoder().encode(JSON.stringify(icerik)));
    }).then(function (sif) { return { tur: tur, tuz: b64(tuz), iv: b64(iv), veri: b64(sif) }; });
  }

  /* ---------- veri ---------- */
  function veriOku() {
    try { var v = JSON.parse(localStorage.getItem(VERI_ANAHTAR) || "null"); if (v && v.musteriler) return duzelt(v); } catch (e) {}
    return duzelt({});
  }
  function duzelt(v) {
    v.musteriler = v.musteriler || []; v.odemeler = v.odemeler || []; v.islemler = v.islemler || [];
    v.ayar = v.ayar || {}; v.ayar.ucret = v.ayar.ucret || { KP: 0, MZ: 0, MT: 0 };
    return v;
  }
  function kaydet() {
    veri.degisti = new Date().toISOString();
    try { localStorage.setItem(VERI_ANAHTAR, JSON.stringify(veri)); } catch (e) { toast("Kayıt yapılamadı!"); }
    yedekUyarisi();
  }
  function msAl(mid) { return veri.musteriler.filter(function (m) { return m.id === mid; })[0]; }
  function odenenAylar(m) {
    var s = {};
    veri.odemeler.forEach(function (o) { if (o.musteriId === m.id) o.aylar.forEach(function (a) { s[a] = o; }); });
    return s;
  }
  function odemeleri(m) { return veri.odemeler.filter(function (o) { return o.musteriId === m.id; }).sort(function (a, b) { return (b.zaman || "").localeCompare(a.zaman || ""); }); }
  function islemleri(m) { return veri.islemler.filter(function (o) { return o.musteriId === m.id; }).sort(function (a, b) { return (b.zaman || "").localeCompare(a.zaman || ""); }); }
  function sonrakiNo(uyg) {
    var n = 0; veri.musteriler.forEach(function (m) { if (m.uyg === uyg) n = Math.max(n, parseInt(m.no, 10) || 0); });
    return C.noYaz(n + 1);
  }
  function gizli(uyg) { return gizliler[uyg]; }

  function durum(m) {
    if (m.kapali) return { tip: "kapali", yazi: "Kapalı", r: "r-gri", sira: 5 };
    if (m.suresiz) return { tip: "suresiz", yazi: "Süresiz", r: "r-mor", sira: 4 };
    var od = odenenAylar(m), simdi = buAy(), bekleyen = [];
    for (var a = m.ilkAy, g = 0; a <= simdi && g < 240; a = ayEkle(a, 1), g++) if (!od[a]) bekleyen.push(a);
    if (simdi < m.ilkAy && !bekleyen.length && !od[m.ilkAy]) return { tip: "baslamadi", yazi: "İlk ödeme " + ayKisa(m.ilkAy), r: "r-mavi", sira: 3, bekleyen: [] };
    if (!bekleyen.length) return { tip: "odendi", yazi: "Ödendi", r: "r-yesil", sira: 3, bekleyen: [] };
    var p = bekleyen[0].split("-"), bas = new Date(+p[0], +p[1] - 1, 1), d = new Date();
    var gun = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - bas) / 86400000);
    if (gun <= 0) return { tip: "bugun", yazi: "Bugün ödeme günü", r: "r-sari", sira: 2, bekleyen: bekleyen, gun: 0 };
    return { tip: "gecikti", yazi: gun + " gün gecikti", r: gun >= 6 ? "r-kirmizi" : "r-sari", sira: 1, bekleyen: bekleyen, gun: gun };
  }
  function sonOdenen(m) { var k = Object.keys(odenenAylar(m)).sort(); return k.length ? k[k.length - 1] : null; }

  /* ---------- giriş ---------- */
  function girisGoster() { $("#giris").classList.remove("gizli"); $("#uyg").classList.add("gizli"); setTimeout(function () { $("#sifre").focus(); }, 100); }
  function uygGoster() { $("#giris").classList.add("gizli"); $("#uyg").classList.remove("gizli"); ciz(); yedekUyarisi(); }
  function girisYap() {
    var s = $("#sifre").value.trim(), btn = $("#girisBtn"), h = $("#girisHata");
    if (!s) { h.textContent = "Şifreyi yaz abi."; return; }
    btn.disabled = true; btn.textContent = "Kontrol ediliyor…"; h.textContent = "";
    kasaAc(s).then(function (g) {
      gizliler = g;
      if ($("#hatirla").checked) { try { localStorage.setItem(HATIRLA_ANAHTAR, JSON.stringify(g)); } catch (e) {} }
      $("#sifre").value = "";
      uygGoster();
    }).catch(function (e) {
      h.textContent = (e && e.name === "OperationError") ? "Şifre yanlış." : (e.message || "Giriş yapılamadı");
    }).then(function () { btn.disabled = false; btn.textContent = "Giriş yap"; });
  }
  function cikis() {
    if (!confirm("Çıkış yapılsın mı? Bir dahaki girişte şifre sorulacak.\n(Müşteri kayıtların silinmez.)")) return;
    try { localStorage.removeItem(HATIRLA_ANAHTAR); } catch (e) {}
    gizliler = null; girisGoster();
  }

  /* ---------- çizim ---------- */
  var BASLIK = {
    genel: ["Genel bakış", function () { var d = new Date(); return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }],
    musteriler: ["Müşteriler", function () { return veri.musteriler.length + " kayıtlı müşteri"; }],
    odemeler: ["Ödemeler", function () { return "Tüm elden tahsilatlar"; }],
    ayarlar: ["Ayarlar", function () { return "Şifre, yedek ve ücretler"; }]
  };
  function ciz() {
    document.querySelectorAll(".menu button").forEach(function (b) { b.classList.toggle("aktif", b.dataset.sayfa === gorunum.sayfa); });
    $("#baslik").textContent = BASLIK[gorunum.sayfa][0];
    $("#altBaslik").textContent = BASLIK[gorunum.sayfa][1]();
    var e = $("#icerik");
    if (gorunum.sayfa === "genel") e.innerHTML = genelHTML();
    else if (gorunum.sayfa === "musteriler") { e.innerHTML = musterilerHTML(); musteriOlaylari(); }
    else if (gorunum.sayfa === "odemeler") { e.innerHTML = odemelerHTML(); odemeOlaylari(); }
    else if (gorunum.sayfa === "ayarlar") { e.innerHTML = ayarlarHTML(); ayarOlaylari(); }
    document.querySelectorAll("[data-musteri]").forEach(function (r) { r.onclick = function () { musteriDetay(r.dataset.musteri); }; });
  }

  var IKON = {
    kisi: '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    para: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
    saat: '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
    tamam: '<svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    ara: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>'
  };

  function genelHTML() {
    var ms = veri.musteriler, simdi = buAy();
    var aktif = ms.filter(function (m) { return !m.kapali; });
    var bekleyen = aktif.filter(function (m) { var d = durum(m); return d.tip === "gecikti" || d.tip === "bugun"; });
    var odeyen = aktif.filter(function (m) { var d = durum(m); return d.tip === "odendi" || d.tip === "suresiz"; });
    var buAyTah = 0, gecenAyTah = 0, gecen = ayEkle(simdi, -1);
    veri.odemeler.forEach(function (o) { if ((o.tarih || "").slice(0, 7) === simdi) buAyTah += Number(o.tutar) || 0; if ((o.tarih || "").slice(0, 7) === gecen) gecenAyTah += Number(o.tutar) || 0; });
    var beklenen = 0; aktif.forEach(function (m) { if (!m.suresiz) beklenen += Number(m.ucret) || 0; });

    var h = '<div class="istatler">' +
      istat("Bu ay tahsilat", para(buAyTah), "Geçen ay " + para(gecenAyTah), "renk-yesil", IKON.para) +
      istat("Aktif müşteri", aktif.length, ms.length - aktif.length ? (ms.length - aktif.length) + " kapalı" : "Hepsi açık", "renk-mavi", IKON.kisi) +
      istat("Ödemesi bekleyen", bekleyen.length, bekleyen.length ? "Takip et" : "Herkes ödedi 🎉", bekleyen.length ? "renk-kirmizi" : "renk-yesil", IKON.saat) +
      istat("Aylık beklenen", para(beklenen), odeyen.length + " müşteri bu ay tamam", "renk-mor", IKON.tamam) +
      '</div>';

    h += '<div class="iki-kolon"><div class="kart"><div class="kart-bas"><h3>Ödemesi bekleyenler</h3>' +
      (bekleyen.length ? '<span class="rozet r-kirmizi">' + bekleyen.length + '</span>' : '') + '</div>';
    if (!bekleyen.length) h += bosHTML("🎉", "Bekleyen ödeme yok", ms.length ? "Bu ay herkes ödemiş abi." : "Önce müşteri ekle, sonra burada takip edersin.");
    else {
      bekleyen.sort(function (a, b) { return (durum(b).gun || 0) - (durum(a).gun || 0); }).forEach(function (m) {
        var d = durum(m);
        h += '<div class="liste-satir" data-musteri="' + m.id + '">' + kisiHTML(m) +
          '<div class="sag"><span class="rozet ' + d.r + '">' + esc(d.yazi) + '</span><div class="kisi-alt" style="margin-top:4px">' + para(m.ucret) + ' / ay</div></div></div>';
      });
    }
    h += '</div><div class="kart"><div class="kart-bas"><h3>Uygulamalar</h3></div><div class="kart-ic">';
    Object.keys(UYG).forEach(function (u) {
      var l = aktif.filter(function (m) { return m.uyg === u; });
      var ok = l.filter(function (m) { var t = durum(m).tip; return t === "odendi" || t === "suresiz" || t === "baslamadi"; }).length;
      var y = l.length ? Math.round(ok / l.length * 100) : 0;
      h += '<div class="uyg-satir"><div class="uyg-rozet uyg-' + u + '">' + u + '</div><div class="uyg-bilgi"><div style="display:flex;justify-content:space-between"><span class="uyg-ad">' + UYG[u].ad + '</span><span class="soluk" style="font-size:13px">' + ok + ' / ' + l.length + '</span></div>' +
        '<div class="cubuk"><i style="width:' + y + '%"></i></div></div></div>';
    });
    h += '</div></div></div>';

    var son = veri.odemeler.slice().sort(function (a, b) { return (b.zaman || "").localeCompare(a.zaman || ""); }).slice(0, 6);
    h += '<div class="kart" style="margin-top:18px"><div class="kart-bas"><h3>Son tahsilatlar</h3><button class="btn btn-ikinci btn-kucuk" onclick="window.__panel.git(\'odemeler\')">Tümü</button></div>';
    if (!son.length) h += bosHTML("💸", "Henüz tahsilat yok", "Bir müşteriden para alınca \"Ödeme al\" de, burada görünür.");
    son.forEach(function (o) { var m = msAl(o.musteriId); if (m) h += odemeSatirHTML(o, m); });
    h += '</div>';
    return h;
  }
  function istat(bas, deger, alt, renk, ikon) {
    return '<div class="kart istat"><div class="istat-ust"><span>' + bas + '</span><span class="istat-ikon ' + renk + '">' + ikon + '</span></div><div class="istat-deger">' + deger + '</div><div class="istat-alt">' + alt + '</div></div>';
  }
  function bosHTML(ikon, bas, alt) { return '<div class="bos"><div class="bos-ikon">' + ikon + '</div><h4>' + bas + '</h4><div>' + alt + '</div></div>'; }
  function kisiHTML(m) {
    return '<div class="kisi"><div class="avatar">' + esc(bashar(m.ad)) + '</div><div><div class="kisi-ad">' + esc(m.ad) + '</div><div class="kisi-alt">' + UYG[m.uyg].ad + ' · No ' + esc(m.no) + '</div></div></div>';
  }
  function uygEtiket(u) { return '<span class="uyg-etiket"><i style="background:' + UYG[u].renk + '"></i>' + UYG[u].ad + '</span>'; }
  function odemeSatirHTML(o, m) {
    var aylar = o.aylar.length === 1 ? ayAdi(o.aylar[0]) : ayKisa(o.aylar[0]) + " – " + ayKisa(o.aylar[o.aylar.length - 1]) + " (" + o.aylar.length + " ay)";
    return '<div class="liste-satir" data-musteri="' + m.id + '">' + kisiHTML(m) + '<div class="sag"><div class="tutar">' + para(o.tutar) + '</div><div class="kisi-alt">' + esc(aylar) + ' · ' + trTarih(o.tarih) + '</div></div></div>';
  }

  /* müşteriler */
  function filtreli() {
    var a = norm(gorunum.arama);
    return veri.musteriler.filter(function (m) {
      if (gorunum.uyg && m.uyg !== gorunum.uyg) return false;
      if (a && norm(m.ad + " " + m.tel + " " + m.no + " " + (m.not || "")).indexOf(a) < 0) return false;
      var t = durum(m).tip;
      if (gorunum.filtre === "bekleyen") return t === "gecikti" || t === "bugun";
      if (gorunum.filtre === "odendi") return t === "odendi" || t === "suresiz" || t === "baslamadi";
      if (gorunum.filtre === "kapali") return t === "kapali";
      return true;
    }).sort(function (x, y) { var a1 = durum(x), b1 = durum(y); return a1.sira - b1.sira || (b1.gun || 0) - (a1.gun || 0) || x.ad.localeCompare(y.ad, "tr"); });
  }
  function musterilerHTML() {
    var l = filtreli();
    var h = '<div class="kart"><div class="arac"><div class="ara">' + IKON.ara + '<input id="araKutu" placeholder="İsim, telefon veya no ara" value="' + esc(gorunum.arama) + '"></div>' +
      '<select id="uygSec" class="secici"><option value="">Tüm uygulamalar</option>' + Object.keys(UYG).map(function (u) { return '<option value="' + u + '"' + (gorunum.uyg === u ? " selected" : "") + '>' + UYG[u].ad + '</option>'; }).join("") + '</select></div>' +
      '<div class="arac" style="padding-top:10px;padding-bottom:10px"><div class="sekmeler">' +
      [["hepsi", "Hepsi"], ["bekleyen", "Bekleyen"], ["odendi", "Ödendi"], ["kapali", "Kapalı"]].map(function (f) { return '<button data-filtre="' + f[0] + '" class="' + (gorunum.filtre === f[0] ? "aktif" : "") + '">' + f[1] + '</button>'; }).join("") +
      '</div></div>';
    if (!veri.musteriler.length) h += bosHTML("👥", "Henüz müşteri yok", "Sağ üstteki <b>Yeni müşteri</b> ile ilk müşterini ekle abi.");
    else if (!l.length) h += bosHTML("🔍", "Sonuç yok", "Aramaya ya da filtreye uyan müşteri bulunamadı.");
    else {
      h += '<div class="masaustu-tablo"><table><thead><tr><th>Müşteri</th><th>Uygulama</th><th>Aylık ücret</th><th>Son ödenen</th><th>Durum</th></tr></thead><tbody>';
      l.forEach(function (m) {
        var d = durum(m), so = sonOdenen(m);
        h += '<tr data-musteri="' + m.id + '"><td>' + kisiHTML(m) + '</td><td>' + uygEtiket(m.uyg) + '</td><td class="tutar">' + (m.suresiz ? "—" : para(m.ucret)) + '</td><td>' + (so ? ayAdi(so) : '<span class="soluk">—</span>') + '</td><td><span class="rozet ' + d.r + '">' + esc(d.yazi) + '</span></td></tr>';
      });
      h += '</tbody></table></div><div class="mobil-liste">';
      l.forEach(function (m) { var d = durum(m); h += '<div class="liste-satir" data-musteri="' + m.id + '">' + kisiHTML(m) + '<div class="sag"><span class="rozet ' + d.r + '">' + esc(d.yazi) + '</span></div></div>'; });
      h += '</div>';
    }
    return h + '</div>';
  }
  function musteriOlaylari() {
    var a = $("#araKutu");
    a.oninput = function () { gorunum.arama = a.value; var pos = a.selectionStart; ciz(); var b = $("#araKutu"); b.focus(); try { b.setSelectionRange(pos, pos); } catch (e) {} };
    $("#uygSec").onchange = function () { gorunum.uyg = this.value; ciz(); };
    document.querySelectorAll("[data-filtre]").forEach(function (b) { b.onclick = function () { gorunum.filtre = b.dataset.filtre; ciz(); }; });
  }

  /* ödemeler */
  function odemelerHTML() {
    var aylarSet = {}; veri.odemeler.forEach(function (o) { aylarSet[(o.tarih || "").slice(0, 7)] = 1; });
    var aylar = Object.keys(aylarSet).sort().reverse();
    var secili = gorunum.odemeAy;
    var l = veri.odemeler.filter(function (o) { return !secili || (o.tarih || "").slice(0, 7) === secili; }).sort(function (a, b) { return (b.zaman || "").localeCompare(a.zaman || ""); });
    var top = 0; l.forEach(function (o) { top += Number(o.tutar) || 0; });
    var h = '<div class="istatler" style="grid-template-columns:repeat(2,1fr)">' +
      istat(secili ? ayAdi(secili) + " toplamı" : "Toplam tahsilat", para(top), l.length + " ödeme", "renk-yesil", IKON.para) +
      istat("Ortalama ödeme", para(l.length ? top / l.length : 0), "Ödeme başına", "renk-mavi", IKON.tamam) + '</div>';
    h += '<div class="kart"><div class="arac"><select id="odemeAySec" class="secici"><option value="">Tüm zamanlar</option>' +
      aylar.map(function (a) { return '<option value="' + a + '"' + (secili === a ? " selected" : "") + '>' + ayAdi(a) + '</option>'; }).join("") + '</select></div>';
    if (!l.length) h += bosHTML("💸", "Ödeme yok", "Seçilen dönemde tahsilat bulunmuyor.");
    l.forEach(function (o) { var m = msAl(o.musteriId); if (m) h += odemeSatirHTML(o, m); });
    return h + '</div>';
  }
  function odemeOlaylari() { $("#odemeAySec").onchange = function () { gorunum.odemeAy = this.value; ciz(); }; }

  /* ayarlar */
  function ayarlarHTML() {
    var u = veri.ayar.ucret;
    var h = '<div class="ayar-izgara"><div class="kart"><div class="kart-bas"><h3>Varsayılan aylık ücretler</h3></div><div class="kart-ic">' +
      '<p class="soluk" style="margin-top:0;font-size:14px">Yeni müşteri eklerken bu ücretler otomatik yazılır.</p>';
    Object.keys(UYG).forEach(function (k) { h += '<label class="alan"><span>' + UYG[k].ad + '</span><input type="number" inputmode="decimal" min="0" data-ucret="' + k + '" value="' + (u[k] || "") + '" placeholder="0"></label>'; });
    h += '<button id="ucretKaydet" class="btn btn-ana">Kaydet</button></div></div>';

    h += '<div class="kart"><div class="kart-bas"><h3>Yedek</h3></div><div class="kart-ic">' +
      '<p class="soluk" style="margin-top:0;font-size:14px">Müşteri ve ödeme kayıtları bu cihazda duruyor. Ara ara yedek al, telefon değişirse ya da tarayıcı temizlenirse yedekten geri yüklersin.</p>' +
      '<div class="ayar-satir"><div><b>Son yedek</b><span>' + (veri.sonYedek ? trTarih(veri.sonYedek) : "Hiç alınmadı") + '</span></div><button id="yedekAl" class="btn btn-ana btn-kucuk">Yedek indir</button></div>' +
      '<div class="ayar-satir"><div><b>Yedekten yükle</b><span>Şu anki kayıtların yerine geçer</span></div><button id="yedekYukle" class="btn btn-ikinci btn-kucuk">Dosya seç</button></div>' +
      '<input type="file" id="yedekDosya" accept=".json,application/json" class="gizli"></div></div>';

    h += '<div class="kart"><div class="kart-bas"><h3>Panel şifresi</h3></div><div class="kart-ic">' +
      '<label class="alan"><span>Yeni şifre</span><input id="yeniSifre1" type="password" autocomplete="new-password" placeholder="En az 8 karakter"></label>' +
      '<label class="alan"><span>Yeni şifre (tekrar)</span><input id="yeniSifre2" type="password" autocomplete="new-password"></label>' +
      '<div class="uyari-kutu">Yeni şifre <b>bu cihazda</b> geçerli olur. Başka bir cihazdan ilk girişte ilk verilen şifre kullanılır.</div>' +
      '<button id="sifreDegis" class="btn btn-ana">Şifreyi değiştir</button></div></div>';

    h += '<div class="kart"><div class="kart-bas"><h3>Nasıl çalışır?</h3></div><div class="kart-ic" style="font-size:14px;line-height:1.65;color:#334155">' +
      '<b>1.</b> Müşteriyi ekle (uygulama, ad, telefon, ücret).<br>' +
      '<b>2.</b> Elden parayı alınca müşteriye tıkla → <b>Ödeme al</b>. Panel o aya özel kodu üretir.<br>' +
      '<b>3.</b> Kodu WhatsApp\'tan gönder ya da müşterinin uygulamasında <b>🔑 Abonelik</b> bölümüne gir.<br>' +
      '<b>4.</b> Ödeme her ayın 1\'inde. 1-5 gün gecikmede uygulamada küçük şerit, 6. günden sonra günde bir uyarı çıkar.<br>' +
      '<b>5.</b> Uygulama asla kendi kendine kapanmaz. Kapatmak için <b>Kapat</b> de, verilen kapatma kodunu müşterinin cihazına gir.<br>' +
      '<span class="soluk">Kodlar internetsiz çalışır; hiçbir sunucuya bağlı değildir.</span></div></div>';
    h += '<div class="kart"><div class="kart-bas"><h3>Oturum</h3></div><div class="kart-ic"><div class="ayar-satir"><div><b>Çıkış yap</b><span>Bu cihaz şifreyi unutur, kayıtlar kalır</span></div><button id="cikis2" class="btn btn-tehlike btn-kucuk">Çıkış</button></div></div></div>';
    return h + '</div>';
  }
  function ayarOlaylari() {
    $("#ucretKaydet").onclick = function () {
      document.querySelectorAll("[data-ucret]").forEach(function (i) { veri.ayar.ucret[i.dataset.ucret] = Number(i.value) || 0; });
      kaydet(); toast("Ücretler kaydedildi");
    };
    $("#yedekAl").onclick = yedekIndir;
    $("#yedekYukle").onclick = function () { $("#yedekDosya").click(); };
    $("#yedekDosya").onchange = function () { if (this.files[0]) yedekOku(this.files[0]); this.value = ""; };
    $("#cikis2").onclick = cikis;
    $("#sifreDegis").onclick = function () {
      var a = $("#yeniSifre1").value, b = $("#yeniSifre2").value;
      if (a.length < 8) { toast("Şifre en az 8 karakter olsun"); return; }
      if (a !== b) { toast("Şifreler aynı değil"); return; }
      kasaKilitle(a, gizliler).then(function (k) {
        localStorage.setItem(KASA_ANAHTAR, JSON.stringify(k));
        $("#yeniSifre1").value = ""; $("#yeniSifre2").value = "";
        toast("Şifre değiştirildi");
      }).catch(function (e) { toast("Değiştirilemedi: " + e.message); });
    };
  }
  function yedekIndir() {
    veri.sonYedek = bugun(); kaydet();
    var ad = "abonelik-yedek-" + bugun() + ".json";
    var b = new Blob([JSON.stringify(veri, null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = ad;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("Yedek indirildi"); if (gorunum.sayfa === "ayarlar") ciz();
  }
  function yedekOku(f) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var v = JSON.parse(r.result);
        if (!v || !Array.isArray(v.musteriler)) throw new Error("Bu bir abonelik yedeği değil");
        if (!confirm("Yedekte " + v.musteriler.length + " müşteri var. Şu anki " + veri.musteriler.length + " müşterinin yerine geçecek. Devam edilsin mi?")) return;
        veri = duzelt(v); kaydet(); ciz(); toast("Yedek yüklendi");
      } catch (e) { toast("Okunamadı: " + e.message); }
    };
    r.readAsText(f);
  }
  function yedekUyarisi() {
    var e = $("#yedekUyari"); if (!e || !veri) return;
    var gun = veri.sonYedek ? Math.round((new Date(bugun()) - new Date(veri.sonYedek)) / 86400000) : 999;
    var degisti = veri.degisti && (!veri.sonYedek || veri.degisti.slice(0, 10) > veri.sonYedek || gun > 0);
    if (veri.musteriler.length && degisti && gun >= 7) {
      e.innerHTML = "💾 " + (veri.sonYedek ? gun + " gündür yedek alınmadı." : "Henüz yedek alınmadı.") + " <b>Şimdi al</b>";
      e.classList.remove("gizli"); e.onclick = yedekIndir;
    } else e.classList.add("gizli");
  }

  /* ---------- modal ---------- */
  function modal(html, genis) {
    modalKapat();
    var d = document.createElement("div"); d.className = "modal-ort"; d.id = "aktifModal";
    d.innerHTML = '<div class="modal' + (genis ? " genis" : "") + '">' + html + '</div>';
    d.addEventListener("mousedown", function (e) { if (e.target === d) modalKapat(); });
    $("#modalKok").appendChild(d);
    d.querySelectorAll("[data-kapat]").forEach(function (b) { b.onclick = modalKapat; });
    return d;
  }
  function modalKapat() { var m = $("#aktifModal"); if (m) m.remove(); }
  function modalBas(bas, alt) { return '<div class="modal-bas"><div><h3>' + bas + '</h3>' + (alt ? '<div class="soluk">' + alt + '</div>' : '') + '</div><button class="kapat-x" data-kapat>×</button></div>'; }

  /* yeni / düzenle */
  function musteriForm(m) {
    var yeni = !m;
    m = m || { uyg: "MZ", ad: "", tel: "", ucret: veri.ayar.ucret.MZ || "", not: "", ilkAy: ayEkle(buAy(), 1) };
    var ayOps = ""; for (var i = -3; i <= 6; i++) { var a = ayEkle(buAy(), i); ayOps += '<option value="' + a + '"' + (a === m.ilkAy ? " selected" : "") + '>' + ayAdi(a) + '</option>'; }
    var d = modal(modalBas(yeni ? "Yeni müşteri" : "Müşteriyi düzenle", yeni ? "Müşteri numarası otomatik verilir" : UYG[m.uyg].ad + " · No " + m.no) +
      '<div class="modal-ic">' +
      '<label class="alan"><span>Uygulama</span><select id="fUyg"' + (yeni ? "" : " disabled") + '>' + Object.keys(UYG).map(function (u) { return '<option value="' + u + '"' + (m.uyg === u ? " selected" : "") + '>' + UYG[u].ad + '</option>'; }).join("") + '</select>' + (yeni ? "" : "<small>Uygulama sonradan değiştirilemez; kodlar uygulamaya özel.</small>") + '</label>' +
      '<label class="alan"><span>Ad soyad / dükkan adı</span><input id="fAd" value="' + esc(m.ad) + '" placeholder="Örn. Yılmaz Tarım"></label>' +
      '<div class="izgara2"><label class="alan"><span>Telefon</span><input id="fTel" type="tel" inputmode="tel" value="' + esc(m.tel) + '" placeholder="05xx xxx xx xx"></label>' +
      '<label class="alan"><span>Aylık ücret (₺)</span><input id="fUcret" type="number" inputmode="decimal" min="0" value="' + esc(m.ucret) + '"></label></div>' +
      '<label class="alan"><span>İlk ödeme ayı</span><select id="fIlk">' + ayOps + '</select><small>Uygulama, kurulduğu ayı hediye sayar; ödeme bir sonraki ayın 1\'inde başlar.</small></label>' +
      '<label class="alan"><span>Not (isteğe bağlı)</span><textarea id="fNot" rows="2">' + esc(m.not) + '</textarea></label>' +
      '</div><div class="modal-alt">' + (yeni ? "" : '<button id="fSil" class="btn btn-tehlike" style="margin-right:auto">Sil</button>') +
      '<button class="btn btn-ikinci" data-kapat>Vazgeç</button><button id="fKaydet" class="btn btn-ana">' + (yeni ? "Müşteriyi ekle" : "Kaydet") + '</button></div>');
    if (yeni) $("#fUyg", d).onchange = function () { $("#fUcret", d).value = veri.ayar.ucret[this.value] || ""; };
    setTimeout(function () { $("#fAd", d).focus(); }, 50);
    $("#fKaydet", d).onclick = function () {
      var ad = $("#fAd", d).value.trim();
      if (!ad) { toast("Adını yaz abi"); $("#fAd", d).focus(); return; }
      if (yeni) {
        var u = $("#fUyg", d).value;
        m = { id: id(), uyg: u, no: sonrakiNo(u), olusturma: bugun() };
        veri.musteriler.push(m);
      }
      m.ad = ad; m.tel = $("#fTel", d).value.trim(); m.ucret = Number($("#fUcret", d).value) || 0;
      m.ilkAy = $("#fIlk", d).value; m.not = $("#fNot", d).value.trim();
      kaydet(); modalKapat(); ciz(); toast(yeni ? "Müşteri eklendi · No " + m.no : "Kaydedildi");
      if (yeni) musteriDetay(m.id);
    };
    if (!yeni) $("#fSil", d).onclick = function () {
      if (!confirm(m.ad + " ve bütün ödeme kayıtları silinsin mi? Bu geri alınamaz.")) return;
      veri.musteriler = veri.musteriler.filter(function (x) { return x.id !== m.id; });
      veri.odemeler = veri.odemeler.filter(function (x) { return x.musteriId !== m.id; });
      veri.islemler = veri.islemler.filter(function (x) { return x.musteriId !== m.id; });
      kaydet(); modalKapat(); ciz(); toast("Silindi");
    };
  }

  /* müşteri detay */
  function musteriDetay(mid) {
    var m = msAl(mid); if (!m) return;
    var d0 = durum(m), od = odenenAylar(m), simdi = buAy();
    var ayH = ""; for (var i = -6; i <= 5; i++) {
      var a = ayEkle(simdi, i), s = "";
      if (m.suresiz || od[a]) s = "odendi"; else if (a >= m.ilkAy && a < simdi) s = "gecikti"; else if (a === simdi && a >= m.ilkAy) s = "bekliyor";
      ayH += '<div class="ay ' + s + (a === simdi ? " suan" : "") + '">' + AY_K[+a.split("-")[1] - 1] + '<small>' + a.slice(0, 4) + '</small></div>';
    }
    var gecmis = odemeleri(m).map(function (o) { return { z: o.zaman, t: "odeme", o: o }; }).concat(islemleri(m).map(function (o) { return { z: o.zaman, t: "islem", o: o }; })).sort(function (a, b) { return (b.z || "").localeCompare(a.z || ""); });
    var gH = gecmis.length ? "" : '<div class="soluk" style="font-size:14px;padding:6px 0">Henüz kayıt yok.</div>';
    gecmis.forEach(function (g) {
      if (g.t === "odeme") {
        var o = g.o, ay = o.aylar.length === 1 ? ayAdi(o.aylar[0]) : ayKisa(o.aylar[0]) + " – " + ayKisa(o.aylar[o.aylar.length - 1]);
        gH += '<div class="gecmis-satir"><span class="rozet r-yesil">Ödeme</span><div><div>' + esc(ay) + '</div><div class="kisi-alt">' + trTarih(o.tarih) + '</div></div><div class="sag"><div class="tutar">' + para(o.tutar) + '</div><button class="btn btn-ikinci btn-kucuk" data-kodgoster="' + o.id + '" style="margin-top:4px">Kodu göster</button></div></div>';
      } else {
        var e = g.o, ad = { kapat: ["Kapatıldı", "r-gri"], ac: ["Açıldı", "r-mavi"], suresiz: ["Süresiz", "r-mor"] }[e.tur] || [e.tur, "r-gri"];
        gH += '<div class="gecmis-satir"><span class="rozet ' + ad[1] + '">' + ad[0] + '</span><div><div class="mono">' + esc(e.kod) + '</div><div class="kisi-alt">' + trTarih(e.zaman) + '</div></div><div class="sag"><button class="btn btn-ikinci btn-kucuk" data-kopya="' + esc(e.kod) + '">Kopyala</button></div></div>';
      }
    });
    var so = sonOdenen(m);
    var d = modal(modalBas("Müşteri kartı", "") +
      '<div class="modal-ic"><div class="detay-ust"><div class="avatar">' + esc(bashar(m.ad)) + '</div><div style="flex:1;min-width:0"><div class="detay-ad">' + esc(m.ad) + '</div><div class="soluk" style="font-size:13.5px">' + UYG[m.uyg].ad + ' · Müşteri no <b>' + esc(m.no) + '</b>' + (m.tel ? ' · ' + esc(m.tel) : '') + '</div></div><span class="rozet ' + d0.r + '">' + esc(d0.yazi) + '</span></div>' +
      '<div class="bilgi-izgara"><div class="bilgi"><small>Aylık ücret</small><b>' + (m.suresiz ? "—" : para(m.ucret)) + '</b></div><div class="bilgi"><small>Son ödenen ay</small><b>' + (m.suresiz ? "Süresiz" : so ? ayAdi(so) : "—") + '</b></div><div class="bilgi"><small>Bekleyen</small><b>' + (d0.bekleyen && d0.bekleyen.length ? d0.bekleyen.length + " ay · " + para(d0.bekleyen.length * (m.ucret || 0)) : "Yok") + '</b></div></div>' +
      '<div class="alt-baslik">Son aylar</div><div class="aylar">' + ayH + '</div>' +
      '<div class="islem-izgara">' +
      (m.kapali ? '<button id="dAc" class="btn btn-yesil">🔓 Uygulamayı aç</button>' : '<button id="dOdeme" class="btn btn-ana">💵 Ödeme al</button>') +
      '<button id="dDuzenle" class="btn btn-ikinci">✏️ Düzenle</button>' +
      (m.kapali ? '' : '<button id="dKapat" class="btn btn-tehlike">🔒 Kapat</button>') +
      (m.suresiz || m.kapali ? '' : '<button id="dSuresiz" class="btn btn-ikinci">♾️ Süresiz yap</button>') +
      '</div>' + (m.not ? '<div class="ozet-kutu">📝 ' + esc(m.not) + '</div>' : '') +
      '<div class="alt-baslik">Geçmiş</div>' + gH + '</div><div class="modal-alt"><button class="btn btn-ikinci" data-kapat>Kapat</button></div>', true);
    var b;
    if ((b = $("#dOdeme", d))) b.onclick = function () { odemeAl(m); };
    if ((b = $("#dKapat", d))) b.onclick = function () { kapatAkisi(m); };
    if ((b = $("#dAc", d))) b.onclick = function () { acAkisi(m); };
    if ((b = $("#dSuresiz", d))) b.onclick = function () { suresizAkisi(m); };
    $("#dDuzenle", d).onclick = function () { musteriForm(m); };
    d.querySelectorAll("[data-kodgoster]").forEach(function (x) { x.onclick = function () { var o = veri.odemeler.filter(function (y) { return y.id === x.dataset.kodgoster; })[0]; if (o) kodGoster(m, o.kod, odemeMesaji(m, o), "abonelik", o); }; });
    d.querySelectorAll("[data-kopya]").forEach(function (x) { x.onclick = function () { kopyala(x.dataset.kopya); }; });
  }

  /* ödeme al */
  function odemeAl(m) {
    var od = odenenAylar(m), dr = durum(m), simdi = buAy();
    var bas = dr.bekleyen && dr.bekleyen.length ? dr.bekleyen[0] : null;
    if (!bas) { var so = sonOdenen(m); bas = so ? ayEkle(so, 1) : (m.ilkAy > simdi ? m.ilkAy : simdi); }
    var secim = { bas: bas, adet: dr.bekleyen && dr.bekleyen.length > 1 ? Math.min(12, dr.bekleyen.length) : 1 };
    var ayOps = ""; for (var i = -11; i <= 12; i++) { var a = ayEkle(simdi, i); ayOps += '<option value="' + a + '"' + (a === secim.bas ? " selected" : "") + '>' + ayAdi(a) + (od[a] ? " (ödendi)" : "") + '</option>'; }
    var d = modal(modalBas("Ödeme al", esc(m.ad) + " · " + UYG[m.uyg].ad) +
      '<div class="modal-ic"><label class="alan"><span>Hangi aydan başlıyor?</span><select id="oBas">' + ayOps + '</select></label>' +
      '<div class="alan"><span style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:6px">Kaç aylık?</span><div class="ay-secim" id="oAdet">' +
      [1, 2, 3, 6].map(function (n) { return '<button data-n="' + n + '">' + n + ' ay</button>'; }).join("") + '</div></div>' +
      '<label class="alan"><span>Alınan tutar (₺)</span><input id="oTutar" type="number" inputmode="decimal" min="0"></label>' +
      '<div class="ozet-kutu" id="oOzet"></div></div>' +
      '<div class="modal-alt"><button class="btn btn-ikinci" data-kapat>Vazgeç</button><button id="oOnay" class="btn btn-ana">Ödemeyi kaydet ve kod üret</button></div>');
    var elle = false;
    function guncelle() {
      d.querySelectorAll("#oAdet button").forEach(function (b) { b.classList.toggle("aktif", +b.dataset.n === secim.adet); });
      if (!elle) $("#oTutar", d).value = (m.ucret || 0) * secim.adet || "";
      var l = C.aylar(secim.bas, secim.adet), zaten = l.filter(function (a) { return od[a]; });
      $("#oOzet", d).innerHTML = "<b>" + (l.length === 1 ? ayAdi(l[0]) : ayAdi(l[0]) + " – " + ayAdi(l[l.length - 1])) + "</b> için " + "<b>" + para($("#oTutar", d).value) + "</b> elden alınacak." +
        (zaten.length ? '<br><span style="color:var(--sari)">⚠️ ' + zaten.map(ayKisa).join(", ") + ' zaten ödenmiş görünüyor.</span>' : "");
    }
    if ([1, 2, 3, 6].indexOf(secim.adet) < 0) {
      var ek = document.createElement("button"); ek.dataset.n = secim.adet; ek.textContent = secim.adet + " ay"; $("#oAdet", d).appendChild(ek);
    }
    d.querySelectorAll("#oAdet button").forEach(function (b) { b.onclick = function () { secim.adet = +b.dataset.n; guncelle(); }; });
    $("#oBas", d).onchange = function () { secim.bas = this.value; guncelle(); };
    $("#oTutar", d).oninput = function () { elle = true; guncelle(); };
    guncelle();
    $("#oOnay", d).onclick = function () {
      var aylar = C.aylar(secim.bas, secim.adet);
      var kod = C.kodUret(gizli(m.uyg), m.uyg, m.no, C.donemAbonelik(secim.bas, secim.adet));
      var o = { id: id(), musteriId: m.id, aylar: aylar, tutar: Number($("#oTutar", d).value) || 0, tarih: bugun(), zaman: new Date().toISOString(), kod: kod };
      veri.odemeler.push(o); kaydet(); ciz();
      kodGoster(m, kod, odemeMesaji(m, o), "abonelik", o);
    };
  }
  function odemeMesaji(m, o) {
    var ay = o.aylar.length === 1 ? ayAdi(o.aylar[0]) : ayAdi(o.aylar[0]) + " – " + ayAdi(o.aylar[o.aylar.length - 1]);
    return "Merhaba " + m.ad + ", " + UYG[m.uyg].ad + " için " + ay + " ödemeniz alındı, teşekkür ederiz 🙏\n\nUygulamaya gireceğiniz kod:\n" + o.kod + "\n\n(Uygulamada 🔑 Abonelik bölümüne yazmanız yeterli.)";
  }
  function waLink(tel, mesaj) {
    var t = String(tel || "").replace(/\D/g, "");
    if (t.length === 11 && t[0] === "0") t = "9" + t;
    else if (t.length === 10 && t[0] === "5") t = "90" + t;
    return "https://wa.me/" + (t.length >= 11 ? t : "") + "?text=" + encodeURIComponent(mesaj);
  }
  function kodGoster(m, kod, mesaj, tur, o) {
    var renk = tur === "kapat" ? " kirmizi" : tur === "ac" ? " yesil" : "";
    var bas = { abonelik: "Ödeme kaydedildi ✓", kapat: "Kapatma kodu", ac: "Açma kodu", suresiz: "Süresiz kullanım kodu" }[tur];
    var etiket = { abonelik: "Abonelik kodu", kapat: "Kapatma kodu", ac: "Açma kodu", suresiz: "Süresiz kod" }[tur];
    var aciklama = tur === "abonelik" ? (o.aylar.length === 1 ? ayAdi(o.aylar[0]) : ayAdi(o.aylar[0]) + " – " + ayAdi(o.aylar[o.aylar.length - 1])) + " · No " + m.no
      : tur === "kapat" ? "Müşterinin cihazında 🔑 Abonelik bölümüne sen gir" : tur === "ac" ? "Kilit ekranındaki kutuya girilecek" : "Bir kez girilir, bir daha kod istemez";
    var d = modal(modalBas(bas, esc(m.ad) + " · " + UYG[m.uyg].ad) +
      '<div class="modal-ic"><div class="kod-kart' + renk + '"><div class="kod-etiket">' + etiket + '</div><div class="kod-deger">' + esc(kod) + '</div><div class="kod-aciklama">' + esc(aciklama) + '</div></div>' +
      (tur === "kapat" ? '<div class="uyari-kutu">Bu kodu müşteriye göndermene gerek yok. Müşterinin cihazında uygulamayı açıp 🔑 <b>Abonelik</b> bölümüne bu kodu yazınca uygulama kapanır. Kayıtları silinmez; açma kodu girilince geri gelir.</div>' : '') +
      '<div class="kod-dugmeler"><button id="kKopya" class="btn btn-ikinci">📋 Kodu kopyala</button>' +
      (tur === "kapat" ? '<button class="btn btn-ana" data-kapat>Tamam</button>' : '<a id="kWa" class="btn wa" target="_blank" rel="noopener">WhatsApp\'tan gönder</a>') + '</div></div>' +
      '<div class="modal-alt"><button id="kKart" class="btn btn-ikinci">Müşteri kartına dön</button><button class="btn btn-ana" data-kapat>Bitti</button></div>');
    $("#kKopya", d).onclick = function () { kopyala(kod); };
    var w = $("#kWa", d); if (w) w.href = waLink(m.tel, mesaj);
    $("#kKart", d).onclick = function () { musteriDetay(m.id); };
  }
  function islemEkle(m, tur) {
    var kod = C.kodUret(gizli(m.uyg), m.uyg, m.no, { kapat: "KAPAT", ac: "AC", suresiz: "SURESIZ" }[tur]);
    veri.islemler.push({ id: id(), musteriId: m.id, tur: tur, kod: kod, zaman: new Date().toISOString() });
    return kod;
  }
  function onayModal(bas, metin, dugme, sinif, fn) {
    var d = modal(modalBas(bas, "") + '<div class="modal-ic"><div class="ozet-kutu" style="line-height:1.55">' + metin + '</div></div>' +
      '<div class="modal-alt"><button class="btn btn-ikinci" data-kapat>Vazgeç</button><button id="onayBtn" class="btn ' + sinif + '">' + dugme + '</button></div>');
    $("#onayBtn", d).onclick = fn;
  }
  function kapatAkisi(m) {
    onayModal("Uygulama kapatılsın mı?", "<b>" + esc(m.ad) + "</b> için kapatma kodu üretilecek. Kodu müşterinin cihazına girince " + UYG[m.uyg].ad + " tamamen kilitlenir.<br><br>Müşterinin kayıtları silinmez. İstediğin zaman açma kodu ile geri açabilirsin.", "Kapatma kodu üret", "btn-tehlike", function () {
      var kod = islemEkle(m, "kapat"); m.kapali = true; kaydet(); ciz();
      kodGoster(m, kod, "", "kapat");
    });
  }
  function acAkisi(m) {
    onayModal("Uygulama yeniden açılsın mı?", "<b>" + esc(m.ad) + "</b> için açma kodu üretilecek. Müşteri kilit ekranındaki kutuya bu kodu girince uygulama açılır.", "Açma kodu üret", "btn-yesil", function () {
      var kod = islemEkle(m, "ac"); m.kapali = false; kaydet(); ciz();
      kodGoster(m, kod, "Merhaba " + m.ad + ", " + UYG[m.uyg].ad + " uygulamanızı yeniden açmak için kilit ekranına şu kodu girin:\n" + kod, "ac");
    });
  }
  function suresizAkisi(m) {
    onayModal("Süresiz kullanım verilsin mi?", "<b>" + esc(m.ad) + "</b> bu kodu bir kez girince uygulama bir daha ödeme sormaz. Aile, kendi dükkanınız gibi ücretsiz kullananlar için.<br><br><span class='soluk'>Not: Süresiz kod internetsiz olduğu için geri alınamaz; gerekirse Kapat ile kapatırsın.</span>", "Süresiz kod üret", "btn-ana", function () {
      var kod = islemEkle(m, "suresiz"); m.suresiz = true; kaydet(); ciz();
      kodGoster(m, kod, "Merhaba " + m.ad + ", " + UYG[m.uyg].ad + " için süresiz kullanım kodunuz:\n" + kod + "\n\n(Uygulamada 🔑 Abonelik bölümüne yazmanız yeterli.)", "suresiz");
    });
  }

  /* ---------- başlat ---------- */
  window.__panel = { git: function (s) { gorunum.sayfa = s; ciz(); window.scrollTo(0, 0); } };
  function basla() {
    veri = veriOku();
    $("#girisBtn").onclick = girisYap;
    $("#sifre").addEventListener("keydown", function (e) { if (e.key === "Enter") girisYap(); });
    $("#cikisBtn").onclick = cikis;
    $("#yeniMusteriBtn").onclick = function () { musteriForm(null); };
    document.querySelectorAll(".menu button").forEach(function (b) { b.onclick = function () { window.__panel.git(b.dataset.sayfa); }; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") modalKapat(); });
    try { var h = JSON.parse(localStorage.getItem(HATIRLA_ANAHTAR) || "null"); if (h && h.KP && h.MZ && h.MT) { gizliler = h; uygGoster(); return; } } catch (e) {}
    girisGoster();
  }
  basla();
})();
