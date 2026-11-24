/* ============================================================
   Abonelik kodu çekirdeği (panel ve uygulamalar ortak kullanır)
   - İnternet gerektirmez, hiçbir sunucuya bağlı değildir.
   - Saf JavaScript SHA-256 / HMAC: http üzerinden açılan sayfalarda da çalışır.
   Kod biçimi:  007-K7M2-9XQ4   (müşteri no + 8 harflik imza)
   ============================================================ */
(function (kok) {
  "use strict";

  /* ---------- SHA-256 ---------- */
  var K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  function sha256(b) { // b: bayt dizisi -> bayt dizisi
    var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = b.length, m = b.slice(); m.push(0x80);
    while (m.length % 64 !== 56) m.push(0);
    var bit = l * 8;
    for (var i = 7; i >= 0; i--) { m.push(i >= 4 ? 0 : (bit >>> (i * 8)) & 255); }
    var w = new Array(64);
    for (var o = 0; o < m.length; o += 64) {
      for (var t = 0; t < 16; t++) w[t] = (m[o+t*4]<<24)|(m[o+t*4+1]<<16)|(m[o+t*4+2]<<8)|m[o+t*4+3];
      for (t = 16; t < 64; t++) {
        var x = w[t-15], y = w[t-2];
        var s0 = ((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3);
        var s1 = ((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
      }
      var a=h[0],bb=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
        var ch = (e&f)^(~e&g);
        var t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
        var S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
        var mj = (a&bb)^(a&c)^(bb&c);
        var t2 = (S0 + mj) | 0;
        hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0;
      }
      h[0]=(h[0]+a)|0; h[1]=(h[1]+bb)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
      h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
    }
    var out = [];
    for (i = 0; i < 8; i++) out.push((h[i]>>>24)&255,(h[i]>>>16)&255,(h[i]>>>8)&255,h[i]&255);
    return out;
  }
  function utf8(s) {
    var o = [], u = unescape(encodeURIComponent(String(s)));
    for (var i = 0; i < u.length; i++) o.push(u.charCodeAt(i));
    return o;
  }
  function hexBayt(hx) { var o = []; for (var i = 0; i < hx.length; i += 2) o.push(parseInt(hx.substr(i, 2), 16)); return o; }
  function hmac(anahtar, mesaj) {
    var k = anahtar.slice();
    if (k.length > 64) k = sha256(k);
    while (k.length < 64) k.push(0);
    var ip = [], op = [];
    for (var i = 0; i < 64; i++) { ip.push(k[i] ^ 0x36); op.push(k[i] ^ 0x5c); }
    return sha256(op.concat(sha256(ip.concat(mesaj))));
  }

  /* ---------- kod ---------- */
  var ABC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 0/O ve 1/I karışmasın diye yok
  function imza(gizli, uyg, no, donem) {
    var h = hmac(hexBayt(gizli), utf8(uyg + "|" + no + "|" + donem));
    // ilk 40 bit -> 8 karakter
    var bitler = 0, say = 0, s = "", i = 0;
    while (s.length < 8) {
      bitler = (bitler << 8) | h[i++]; say += 8;
      while (say >= 5 && s.length < 8) { say -= 5; s += ABC[(bitler >>> say) & 31]; }
      bitler &= (1 << say) - 1;
    }
    return s;
  }
  function noYaz(no) { no = String(parseInt(no, 10)); while (no.length < 3) no = "0" + no; return no; }
  function kodUret(gizli, uyg, no, donem) {
    no = noYaz(no);
    var s = imza(gizli, uyg, no, donem);
    return no + "-" + s.slice(0, 4) + "-" + s.slice(4);
  }
  function kodTemizle(k) {
    k = String(k || "").toLocaleUpperCase("en").replace(/[^0-9A-Z]/g, "");
    if (!/^[0-9]{3}[0-9A-Z]{8}$/.test(k)) return null;
    return { no: k.slice(0, 3), imza: k.slice(3) };
  }

  /* ---------- ay hesapları ---------- */
  function ayAnahtar(y, m) { // m: 0-11 (taşma olabilir)
    var d = new Date(y, m, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function aylar(baslangic, adet) { // "2026-12", 3 -> ["2026-12","2027-01","2027-02"]
    var p = baslangic.split("-"), y = +p[0], m = +p[1] - 1, o = [];
    for (var i = 0; i < adet; i++) o.push(ayAnahtar(y, m + i));
    return o;
  }
  function donemAbonelik(baslangic, adet) { return "A:" + baslangic + ":" + adet; }

  // Uygulama tarafı: kodu çöz. simdi: Date
  function kodCoz(gizli, uyg, girilen, simdi) {
    var k = kodTemizle(girilen);
    if (!k) return { ok: false, hata: "Kod biçimi hatalı. Örnek: 007-K7M2-9XQ4" };
    function dene(d) { return imza(gizli, uyg, k.no, d) === k.imza; }
    if (dene("SURESIZ")) return { ok: true, no: k.no, tur: "suresiz" };
    if (dene("KAPAT"))   return { ok: true, no: k.no, tur: "kapat" };
    if (dene("AC"))      return { ok: true, no: k.no, tur: "ac" };
    var y = simdi.getFullYear(), m = simdi.getMonth();
    for (var ofs = -12; ofs <= 13; ofs++) {
      var bas = ayAnahtar(y, m + ofs);
      for (var n = 1; n <= 12; n++) {
        if (dene(donemAbonelik(bas, n))) return { ok: true, no: k.no, tur: "abonelik", aylar: aylar(bas, n) };
      }
    }
    return { ok: false, hata: "Kod geçersiz. Kodu doğru yazdığınızdan emin olun." };
  }

  kok.LisansCekirdek = {
    kodUret: kodUret, kodCoz: kodCoz, kodTemizle: kodTemizle, noYaz: noYaz,
    aylar: aylar, ayAnahtar: ayAnahtar, donemAbonelik: donemAbonelik,
    _sha256: sha256, _utf8: utf8, _hmac: hmac, _hex: hexBayt
  };
})(typeof window !== "undefined" ? window : globalThis);
