// ====== FIREBASE SOZLAMASI ======
// Firebase konsolidan olingan config'ni shu yerga qo'ying (README.txt ga qarang)
const firebaseConfig = {
  apiKey: "SHU_YERGA",
  authDomain: "SHU_YERGA",
  projectId: "SHU_YERGA",
  appId: "SHU_YERGA"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let allProviders = []; // hamma foydalanuvchilar uchun umumiy ro'yxat

// ====== Sozlamalar ======
const TYPES = {
  traktor: "🚜 Traktor (yer haydash)",
  kombayn: "🌾 Kombayn",
  labo: "🚐 Labo",
  kamaz: "🚚 KamAZ",
  boshqa: "🔧 Boshqa"
};

// ====== Yordamchi funksiyalar ======
const $ = id => document.getElementById(id);
let myPos = null;   // qidiruvchining joylashuvi
let regPos = null;  // ro'yxatdan o'tuvchining joylashuvi
let filter = "";

function loadData() { return allProviders.map(r => ({ ...r })); }

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

// Ikki nuqta orasidagi masofa (km)
function distanceKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getLocation(onOk, infoEl) {
  if (!navigator.geolocation) { infoEl.textContent = "Brauzer joylashuvni qo‘llamaydi"; return; }
  infoEl.textContent = "Aniqlanmoqda…";
  navigator.geolocation.getCurrentPosition(
    p => onOk({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => { infoEl.textContent = "Ruxsat berilmadi. Brauzer sozlamasidan ruxsat bering."; },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

// ====== Tab almashtirish ======
function showTab(name) {
  $("secSearch").classList.toggle("hidden", name !== "search");
  $("secReg").classList.toggle("hidden", name !== "reg");
  $("btnSearch").classList.toggle("active", name === "search");
  $("btnReg").classList.toggle("active", name === "reg");
  if (name === "search") render();
}
$("btnSearch").onclick = () => showTab("search");
$("btnReg").onclick = () => showTab("reg");

// ====== Qidirish ======
function renderChips() {
  const all = [["", "Hammasi"], ...Object.entries(TYPES)];
  $("chips").innerHTML = all.map(([k, v]) =>
    `<button data-k="${k}" class="${filter === k ? "active" : ""}">${v}</button>`).join("");
  $("chips").querySelectorAll("button").forEach(b => {
    b.onclick = () => { filter = b.dataset.k; renderChips(); render(); };
  });
}

function render() {
  const q = $("searchText").value.trim().toLowerCase();
  let rows = loadData().filter(r =>
    (!filter || r.type === filter) &&
    (!q || (r.firstName + " " + r.lastName + " " + r.district).toLowerCase().includes(q)));

  rows.forEach(r => { r.km = myPos ? distanceKm(myPos, r) : null; });
  rows.sort((a, b) => (a.km == null) - (b.km == null) || (a.km || 0) - (b.km || 0));

  if (!rows.length) {
    $("list").innerHTML = '<div class="card muted">Hozircha hech kim topilmadi.</div>';
    return;
  }
  $("list").innerHTML = rows.map(r => {
    const tel = String(r.phone).replace(/[^\d+]/g, "");
    const dist = r.km != null ? ` · <b>${r.km < 1 ? "1 km dan kam" : r.km.toFixed(1) + " km"}</b>` : "";
    return `
      <div class="card item">
        <h3>${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}</h3>
        <span class="tag">${escapeHtml(TYPES[r.type] || r.type)}</span>${dist}
        <p class="muted">${escapeHtml(r.district)} ${escapeHtml(r.desc)}</p>
        ${r.price ? `<div>💰 ${escapeHtml(r.price)}</div>` : ""}
        <div class="actions">
          <a class="btn primary" href="tel:${escapeHtml(tel)}">📞 ${escapeHtml(r.phone)}</a>
          <a class="btn" target="_blank" rel="noopener"
             href="https://www.google.com/maps?q=${r.lat},${r.lng}">🗺 Xaritada</a>
        </div>
      </div>`;
  }).join("");
}

$("btnLoc").onclick = () => getLocation(p => {
  myPos = p;
  $("locInfo").textContent = "Joylashuv aniqlandi — yaqinlari birinchi";
  render();
}, $("locInfo"));
$("searchText").oninput = render;

// ====== Ro'yxatdan o'tish ======
$("type").innerHTML = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");

$("btnRegLoc").onclick = () => getLocation(p => {
  regPos = p;
  $("regLocInfo").textContent = "Aniqlandi ✓";
}, $("regLocInfo"));

$("regForm").onsubmit = e => {
  e.preventDefault();
  const phone = $("phone").value.trim();
  if (phone.replace(/\D/g, "").length < 9) { $("msg").textContent = "Telefon raqamni to‘g‘ri kiriting"; return; }
  if (!regPos) { $("msg").textContent = "Joylashuvingizni aniqlang — mijozlar sizni shu orqali topadi"; return; }

  const id = phone.replace(/\D/g, ""); // bir raqam — bitta e'lon
  const item = {
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    phone, type: $("type").value,
    district: $("district").value.trim(),
    price: $("price").value.trim(),
    desc: $("desc").value.trim(),
    lat: regPos.lat, lng: regPos.lng,
    updated: Date.now()
  };
  db.collection("providers").doc(id).set(item)
    .then(() => { $("msg").textContent = "Saqlandi ✓ Endi sizni hamma qidiruvda topadi."; })
    .catch(err => { $("msg").textContent = "Saqlab bo‘lmadi: " + err.message; });
  $("regForm").reset();
  regPos = null;
  $("regLocInfo").textContent = "aniqlanmagan";
};

renderChips();
// Real vaqtda: kimdir ro'yxatdan o'tsa, hamma ekranida darhol chiqadi
db.collection("providers").onSnapshot(
  snap => { allProviders = snap.docs.map(d => d.data()); render(); },
  err => { $("list").innerHTML = '<div class="card muted">Ma’lumotni o‘qib bo‘lmadi: ' + escapeHtml(err.message) + '</div>'; }
);
render();