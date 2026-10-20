// Initialisiere Supabase
const supabaseClient = supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY,
);

// DOM Elemente (Tabs)
const tabBtnSolargrafien = document.getElementById("tab-btn-solargrafien");
const tabBtnTranslations = document.getElementById("tab-btn-translations");
const tabBtnUsers = document.getElementById("tab-btn-users");
const tabSolargrafien = document.getElementById("tab-solargrafien");
const tabTranslations = document.getElementById("tab-translations");
const tabUsers = document.getElementById("tab-users");

// DOM Elemente
const loadingContainer = document.getElementById("loading-container");
const loginContainer = document.getElementById("login-container");
const dashboardContainer = document.getElementById("dashboard-container");
const userEmailSpan = document.getElementById("user-email");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");

// UI Update Logik
let currentUserEmail = null;
let currentUserRole = null;

async function updateUI(session) {
  loadingContainer.classList.remove("hidden");
  loginContainer.classList.add("hidden");
  dashboardContainer.classList.add("hidden");

  if (session) {
    currentUserEmail = session.user.email;

    try {
      const { data, error } = await supabaseClient
        .from("admins")
        .select("rolle")
        .eq("email", currentUserEmail)
        .single();

      if (error || !data) {
        throw new Error("Kein Zugriff: Benutzer nicht berechtigt.");
      }

      currentUserRole = data.rolle; // 'superadmin' oder 'erfasser'

      // Permissions für Tabs
      if (currentUserRole === "erfasser") {
        tabBtnTranslations.classList.add("hidden");
        tabBtnUsers.classList.add("hidden");
      } else {
        tabBtnTranslations.classList.remove("hidden");
        tabBtnUsers.classList.remove("hidden");
      }

      loadingContainer.classList.add("hidden");
      dashboardContainer.classList.remove("hidden");
      userEmailSpan.textContent = `${currentUserEmail} (${currentUserRole})`;
      loadSolargrafien();
    } catch (err) {
      console.error("Rollen-Check fehlgeschlagen:", err.message);
      alert(err.message);
      await supabaseClient.auth.signOut();

      currentUserEmail = null;
      currentUserRole = null;
      loadingContainer.classList.add("hidden");
      loginContainer.classList.remove("hidden");
      userEmailSpan.textContent = "";
    }
  } else {
    // User ist NICHT eingeloggt
    currentUserEmail = null;
    currentUserRole = null;
    loadingContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
    userEmailSpan.textContent = "";
  }
}

// Event Listener
btnLogin.addEventListener("click", async () => {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
  } catch (error) {
    console.error("Fehler beim Login:", error.message);
    alert("Fehler beim Login: " + error.message);
  }
});

btnLogout.addEventListener("click", async () => {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Fehler beim Logout:", error.message);
    alert("Fehler beim Logout: " + error.message);
  }
});

// Initialer Status Check & Auth State Listener
async function initAuth() {
  // 1. Initialen Session-Status abfragen
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Fehler beim Abrufen der Session:", error.message);
  }
  updateUI(session);

  // 2. Auf Änderungen lauschen (Login/Logout in anderen Tabs etc.)
  supabaseClient.auth.onAuthStateChange((event, newSession) => {
    console.log("Auth Event:", event);
    updateUI(newSession);
  });
}

// Start
document.addEventListener("DOMContentLoaded", initAuth);

// DOM Elemente (Tabs)

// DOM Elemente CRUD

// DOM Elemente CRUD
const searchInput = document.getElementById("searchInput");
const solargrafienList = document.getElementById("solargrafien-list");

const solargrafieForm = document.getElementById("solargrafie-form");
const statusMessage = document.getElementById("status-message");
const btnNew = document.getElementById("btn-new");
const btnRefresh = document.getElementById("btn-refresh");
const btnCancel = document.getElementById("btn-cancel");
const btnSubmit = document.getElementById("btn-submit");
const formTitle = document.getElementById("form-title");

// Globale Daten
let alleSolargrafien = [];

// Bild URL auflösen (wie im Haupt-Frontend)
function resolveImageUrl(val) {
  if (!val) return "";
  val = String(val).trim();

  const localBase =
    typeof APP_CONFIG !== "undefined" && APP_CONFIG.localImageFolder
      ? APP_CONFIG.localImageFolder
      : "./Bilder/";

  if (
    !val.startsWith("http://") &&
    !val.startsWith("https://") &&
    !val.startsWith("data:")
  ) {
    return localBase + val;
  }

  return val;
}

// Hilfsfunktion: Nachrichten anzeigen
function showMessage(msg, isError = false) {
  statusMessage.textContent = msg;
  statusMessage.className = "message-box";
  statusMessage.classList.add(isError ? "error" : "success");
  statusMessage.style.display = "block";

  // Nach 5 Sekunden ausblenden
  setTimeout(() => {
    statusMessage.style.display = "none";
    statusMessage.className = "message-box";
  }, 5000);
}

// 1. READ: Daten laden und rendern
async function loadSolargrafien() {
  solargrafienList.innerHTML = "<p>Lade Daten...</p>";
  try {
    const { data, error } = await supabaseClient
      .from("solargrafien")
      .select("*")
      .order("placed", { ascending: false });

    if (error) throw error;

    alleSolargrafien = data;
    renderList(data);
  } catch (error) {
    console.error("Fehler beim Laden:", error.message);
    solargrafienList.innerHTML = `<p style="color: #ef4444;">Fehler: ${error.message}</p>`;
  }
}

// Hilfsfunktion: Liste rendern
function renderList(data) {
  if (!data || data.length === 0) {
    solargrafienList.innerHTML = "<p>Keine Einträge gefunden.</p>";
    return;
  }

  solargrafienList.innerHTML = "";
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-item";

    // Add data attributes for searching
    div.dataset.titel = (item.titel || "").toLowerCase();
    div.dataset.owner = (item.email || "").toLowerCase();

    // Fallback für undefinierte Werte
    const placedDate = item.placed ? item.placed : "Unbekannt";
    const title = item.titel ? item.titel : "Ohne Titel";

    // Thumbnail Fallback (z.B. ein Platzhalter, falls keine URL vorhanden ist)
    const primaryImg = item.bild_haupt ? item.bild_haupt : item.bild_url;
    const imgUrl = primaryImg
      ? escapeHtml(resolveImageUrl(primaryImg))
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="%23bec8d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

    // Berechtigungen prüfen: Superadmin darf alles, Erfasser nur eigene
    let disableActions = false;
    if (currentUserRole === "erfasser" && item.email !== currentUserEmail) {
      disableActions = true;
    }

    const disabledAttr = disableActions ? 'disabled="disabled"' : "";

    div.innerHTML = `
      <div class="list-item-content">
        <img src="${imgUrl}" alt="Thumbnail" class="list-item-thumbnail" loading="lazy">
        <div class="list-item-info">
          <strong>${escapeHtml(title)}</strong>
          <span>Placed: ${escapeHtml(placedDate)}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-small btn-edit" data-id="${item.id}" ${disabledAttr}>Edit</button>
        <button class="btn btn-small btn-danger btn-delete" data-id="${item.id}" ${disabledAttr}>Delete</button>
      </div>
    `;
    solargrafienList.appendChild(div);
  });

  // Event Listener für Edit/Delete Buttons hinzufügen
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => loadFormForEdit(e.target.dataset.id));
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      deleteSolargrafie(e.target.dataset.id),
    );
  });
}

// Hilfsfunktion XSS Schutz
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 2. LOAD: Formular für Edit füllen
function loadFormForEdit(id) {
  const item = alleSolargrafien.find((s) => s.id == id);
  if (!item) return;

  // Felder füllen
  document.getElementById("edit-id").value = item.id;
  document.getElementById("titel").value = item.titel || "";
  document.getElementById("zeitstempel").value = item.zeitstempel || "";
  document.getElementById("google_fotos_url").value =
    item.google_fotos_url || "";
  document.getElementById("externe_id").value = item.externe_id || "";
  document.getElementById("tage_belichtung").value =
    item.tage_belichtung !== null && item.tage_belichtung !== undefined
      ? item.tage_belichtung
      : "";
  document.getElementById("tage_verdeckt").value =
    item.tage_verdeckt !== null && item.tage_verdeckt !== undefined
      ? item.tage_verdeckt
      : "";
  document.getElementById("sichtbare_boegen").value =
    item.sichtbare_boegen !== null && item.sichtbare_boegen !== undefined
      ? item.sichtbare_boegen
      : "";
  document.getElementById("sonnenhoehe_max").value =
    item.sonnenhoehe_max !== null && item.sonnenhoehe_max !== undefined
      ? item.sonnenhoehe_max
      : "";
  document.getElementById("sonnenhoehe_min").value =
    item.sonnenhoehe_min !== null && item.sonnenhoehe_min !== undefined
      ? item.sonnenhoehe_min
      : "";

  document.getElementById("email").value = item.email || "";
  // E-Mail Logik Superadmin
  if (currentUserRole === "superadmin") {
    document.getElementById("email").removeAttribute("readonly");
  } else {
    document.getElementById("email").setAttribute("readonly", true);
  }
  document.getElementById("owner").value = item.owner || "";
  try {
    ownerTags = item.owner ? JSON.parse(item.owner) : [];
    if (!Array.isArray(ownerTags)) ownerTags = [item.owner];
  } catch (e) {
    ownerTags = item.owner ? [item.owner] : [];
  }
  updateOwnerHidden();
  renderTags();
  document.getElementById("lat").value = item.lat ?? "";
  document.getElementById("lng").value = item.lng ?? "";
  document.getElementById("placed").value = item.placed || "";
  document.getElementById("opened").value = item.opened || "";
  document.getElementById("kamera").value = item.kamera || "";
  document.getElementById("fotopapier").value = item.fotopapier || "";
  // Bilder und Vorschauen laden
  const handlePreview = (imgUrl, previewId, containerId) => {
    if (imgUrl) {
      document.getElementById(previewId).src = escapeHtml(
        resolveImageUrl(imgUrl),
      );
      document.getElementById(containerId).classList.remove("hidden");
    } else {
      document.getElementById(previewId).src = "";
      document.getElementById(containerId).classList.add("hidden");
    }
  };
  handlePreview(item.bild_haupt, "preview-haupt", "preview-container-haupt");
  handlePreview(item.bild_doku, "preview-doku", "preview-container-doku");
  handlePreview(item.bild_raw, "preview-raw", "preview-container-raw");
  document.getElementById("comment_status").value =
    item.comment_status || "open";
  // The database column is named 'status', mapping it to the 'notizen' form field
  document.getElementById("notizen").value = item.status || "";

  // UI anpassen
  formTitle.textContent = "Eintrag bearbeiten";
  btnSubmit.textContent = "Aktualisieren";
  btnCancel.classList.remove("hidden");

  // Zum Formular scrollen
  formTitle.scrollIntoView({ behavior: "smooth" });
}

// Formular leeren (Neuer Eintrag)
function resetForm() {
  solargrafieForm.reset();
  document.getElementById("edit-id").value = "";
  // E-Mail Logik Superadmin
  if (currentUserRole === "superadmin") {
    document.getElementById("email").removeAttribute("readonly");
    document.getElementById("email").value = currentUserEmail;
  } else {
    document.getElementById("email").setAttribute("readonly", true);
    document.getElementById("email").value = currentUserEmail;
  }
  document.getElementById("zeitstempel").value = "";
  ownerTags = [];
  updateOwnerHidden();
  renderTags();
  ownerInput.value = "";
  document.getElementById("preview-container-haupt").classList.add("hidden");
  document.getElementById("preview-container-doku").classList.add("hidden");
  document.getElementById("preview-container-raw").classList.add("hidden");
  document.getElementById("preview-haupt").src = "";
  document.getElementById("preview-doku").src = "";
  document.getElementById("preview-raw").src = "";
  document.getElementById("tage_belichtung").value = "";
  document.getElementById("tage_verdeckt").value = "";
  document.getElementById("sichtbare_boegen").value = "";
  document.getElementById("sonnenhoehe_max").value = "";
  document.getElementById("sonnenhoehe_min").value = "";

  // UI anpassen
  formTitle.textContent = "Neuer Eintrag erstellen";
  btnSubmit.textContent = "Speichern";
  btnCancel.classList.add("hidden");
}

btnNew.addEventListener("click", resetForm);
btnRefresh.addEventListener("click", loadSolargrafien);

btnCancel.addEventListener("click", resetForm);

// 3. Client-seitige Bildverkleinerung
const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert(
        "Für die Web-Bilder (Haupt, Doku) bitte JPG, PNG oder WebP verwenden. TIFF-Scans bitte nur in das Raw-Feld laden.",
      );
      reject(new Error("Ungültiges Dateiformat."));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      const MAX_SIZE = 1600;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error("Fehler beim Erstellen des komprimierten Bildes."),
            );
          }
        },
        "image/webp",
        0.8,
      );
    };

    img.onerror = () => {
      reject(new Error("Fehler beim Laden des Bildes zur Komprimierung."));
    };

    img.src = url;
  });
};

// --- Owner Tags Logic ---
let ownerTags = [];
const ownerInput = document.getElementById("owner-input");
const ownerHidden = document.getElementById("owner");
const tagsContainer = document.getElementById("tags-container");

function renderTags() {
  document.querySelectorAll(".tag").forEach((e) => e.remove());

  ownerTags.forEach((tag, index) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.innerText = tag;

    const closeEl = document.createElement("span");
    closeEl.className = "tag-close";
    closeEl.innerText = "×";
    closeEl.onclick = () => {
      ownerTags.splice(index, 1);
      updateOwnerHidden();
      renderTags();
    };

    tagEl.appendChild(closeEl);
    tagsContainer.insertBefore(tagEl, ownerInput);
  });
}

function updateOwnerHidden() {
  if (ownerTags.length === 0) {
    ownerHidden.value = "";
  } else {
    ownerHidden.value = JSON.stringify(ownerTags);
  }
}

ownerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = ownerInput.value.trim();
    if (val) {
      if (val.includes("@")) {
        if (!ownerTags.includes(val)) {
          ownerTags.push(val);
          updateOwnerHidden();
          renderTags();
        }
        ownerInput.value = "";
      } else {
        alert("Owner muss ein @ enthalten (@name oder email@domain.ch).");
      }
    }
  }
});
// --- End Owner Tags Logic ---

// --- Berechnungs Logik ---
function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(".");
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function getSunAltitude(date, lat) {
  if (!date || isNaN(date.getTime()) || lat == null) return null;
  const PI = Math.PI,
    sin = Math.sin,
    asin = Math.asin;
  const d = date.getTime() / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) % 360;
  const gRad = (g * PI) / 180;
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * sin(gRad) + 0.02 * sin(2 * gRad)) % 360;
  const lRad = (l * PI) / 180;
  const e = 23.439 - 0.00000036 * d;
  const eRad = (e * PI) / 180;
  const decRad = asin(sin(eRad) * sin(lRad));
  const dec = (decRad * 180) / PI;
  return 90 - lat + dec;
}

async function getCloudyDays(lat, lng, startStr, endStr) {
  if (!lat || !lng || !startStr || !endStr) return 0;
  try {
    const s = parseDateStr(startStr);
    const e = parseDateStr(endStr);
    if (!s || !e || isNaN(s) || isNaN(e)) return 0;
    const start = s.toISOString().split("T")[0];
    const end = e.toISOString().split("T")[0];
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=sunshine_duration&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    let cloudyDays = 0;
    if (data.daily && data.daily.sunshine_duration) {
      for (const dur of data.daily.sunshine_duration) {
        if (dur === null || dur < 3 * 3600) cloudyDays++;
      }
    }
    return cloudyDays;
  } catch (e) {
    console.error("Weather API error", e);
    return 0;
  }
}

document.getElementById("btn-calc").addEventListener("click", async () => {
  const btn = document.getElementById("btn-calc");
  btn.disabled = true;
  btn.textContent = "Berechnet...";

  try {
    const latVal = document.getElementById("lat").value;
    const lngVal = document.getElementById("lng").value;
    const placedVal = document.getElementById("placed").value;
    const openedVal = document.getElementById("opened").value;

    const lat = latVal === "" ? null : parseFloat(latVal);
    const lng = lngVal === "" ? null : parseFloat(lngVal);

    let tage_belichtung = null;
    let tage_verdeckt = null;
    let sichtbare_boegen = null;
    let sonnenhoehe_max = null;
    let sonnenhoehe_min = null;

    if (placedVal && openedVal) {
      const startD = parseDateStr(placedVal);
      const endD = parseDateStr(openedVal);
      if (startD && endD) {
        tage_belichtung = Math.round((endD - startD) / (1000 * 60 * 60 * 24));
      }
    }

    if (lat !== null) {
      if (placedVal) {
        const maxD = parseDateStr(placedVal);
        if (maxD) {
          sonnenhoehe_max = getSunAltitude(maxD, lat);
          if (sonnenhoehe_max !== null)
            sonnenhoehe_max = parseFloat(sonnenhoehe_max.toFixed(2));
        }
      }
      if (openedVal) {
        const minD = parseDateStr(openedVal);
        if (minD) {
          sonnenhoehe_min = getSunAltitude(minD, lat);
          if (sonnenhoehe_min !== null)
            sonnenhoehe_min = parseFloat(sonnenhoehe_min.toFixed(2));
        }
      }

      if (placedVal && openedVal && lng !== null) {
        tage_verdeckt = await getCloudyDays(lat, lng, placedVal, openedVal);
        if (tage_belichtung !== null) {
          sichtbare_boegen = Math.max(0, tage_belichtung - tage_verdeckt);
        }
      }
    }

    document.getElementById("tage_belichtung").value =
      tage_belichtung !== null ? tage_belichtung : "";
    document.getElementById("tage_verdeckt").value =
      tage_verdeckt !== null ? tage_verdeckt : "";
    document.getElementById("sichtbare_boegen").value =
      sichtbare_boegen !== null ? sichtbare_boegen : "";
    document.getElementById("sonnenhoehe_max").value =
      sonnenhoehe_max !== null ? sonnenhoehe_max : "";
    document.getElementById("sonnenhoehe_min").value =
      sonnenhoehe_min !== null ? sonnenhoehe_min : "";

    showMessage("Berechnung abgeschlossen.");
  } catch (e) {
    console.error(e);
    showMessage("Fehler bei der Berechnung.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Werte berechnen";
  }
});
// --- End Berechnungs Logik ---

// 3. CREATE / UPDATE: Formular absenden
solargrafieForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Werte auslesen
  const id = document.getElementById("edit-id").value;

  // Hilfsfunktion: Leere Strings zu null machen
  const getValue = (id) => {
    const val = document.getElementById(id).value.trim();
    return val === "" ? null : val;
  };

  const latVal = document.getElementById("lat").value;
  const lngVal = document.getElementById("lng").value;

  // Datensatz zusammenbauen
  // Bild-Upload Logik
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Lädt hoch...";

  const uploadImage = async (fileInputId) => {
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files.length === 0) return null;
    let file = fileInput.files[0];
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "");

    if (fileInputId === "bild_haupt" || fileInputId === "bild_doku") {
      try {
        file = await resizeImage(file);
      } catch (err) {
        throw err;
      }
    }

    let extension = file.name ? file.name.split(".").pop() : "webp";
    if (
      (fileInputId === "bild_haupt" || fileInputId === "bild_doku") &&
      !file.name
    ) {
      extension = "webp";
    }

    const fileName = `${Date.now()}_${cleanFileName.split(".")[0]}.${extension}`;
    const { data, error } = await supabaseClient.storage
      .from("solargrafien-bilder")
      .upload(fileName, file, { contentType: file.type });

    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabaseClient.storage
      .from("solargrafien-bilder")
      .getPublicUrl(fileName);
    return publicUrl;
  };

  try {
    const urlHaupt = await uploadImage("bild_haupt");
    const urlDoku = await uploadImage("bild_doku");
    const urlRaw = await uploadImage("bild_raw");

    const record = {
      titel: getValue("titel"),
      lat: latVal === "" ? null : parseFloat(latVal),
      lng: lngVal === "" ? null : parseFloat(lngVal),
      placed: getValue("placed"),
      opened: getValue("opened") || null,
      kamera: getValue("kamera"),
      ...(urlHaupt ? { bild_haupt: urlHaupt } : {}),
      ...(urlDoku ? { bild_doku: urlDoku } : {}),
      ...(urlRaw ? { bild_raw: urlRaw } : {}),
      fotopapier: getValue("fotopapier"),

      google_fotos_url: getValue("google_fotos_url"),
      externe_id: getValue("externe_id"),
      email: getValue("email"),
      owner: getValue("owner"),
      comment_status: document.getElementById("comment_status").value,
      tage_belichtung:
        getValue("tage_belichtung") === null
          ? null
          : parseInt(getValue("tage_belichtung")),
      tage_verdeckt:
        getValue("tage_verdeckt") === null
          ? null
          : parseInt(getValue("tage_verdeckt")),
      sichtbare_boegen:
        getValue("sichtbare_boegen") === null
          ? null
          : parseInt(getValue("sichtbare_boegen")),
      sonnenhoehe_max:
        getValue("sonnenhoehe_max") === null
          ? null
          : parseFloat(getValue("sonnenhoehe_max")),
      sonnenhoehe_min:
        getValue("sonnenhoehe_min") === null
          ? null
          : parseFloat(getValue("sonnenhoehe_min")),
    };

    const notizenVal = getValue("notizen");
    record.status = notizenVal;

    // Database save logic was here but moved inside the upload try block

    // Disable Button während des Speicherns
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Speichert...";

    if (id) {
      // UPDATE
      const { error } = await supabaseClient
        .from("solargrafien")
        .update(record)
        .eq("id", id);

      if (error) throw error;
      showMessage("Eintrag erfolgreich aktualisiert!");
    } else {
      // CREATE
      // Beim Erstellen die E-Mail des aktuellen Users erzwingen
      record.email = currentUserEmail;

      const { error } = await supabaseClient
        .from("solargrafien")
        .insert([record]);

      if (error) throw error;
      showMessage("Neuer Eintrag erfolgreich gespeichert!");
    }

    resetForm();
    loadSolargrafien();
  } catch (error) {
    console.error("Fehler beim Speichern:", error.message);
    showMessage("Fehler: " + error.message, true);
  } finally {
    btnSubmit.disabled = false;
    // resetForm sets text to 'Speichern', so we only update it if we are still editing
    const currentId = document.getElementById("edit-id").value;
    btnSubmit.textContent = currentId ? "Aktualisieren" : "Speichern";
  }
});

// 4. DELETE: Eintrag löschen
async function deleteSolargrafie(id) {
  if (
    !confirm(
      "Möchtest du diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    )
  ) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("solargrafien")
      .delete()
      .eq("id", id);

    if (error) throw error;

    showMessage("Eintrag erfolgreich gelöscht.");
    loadSolargrafien();

    // Wenn der gelöschte Eintrag gerade bearbeitet wurde, Formular leeren
    if (document.getElementById("edit-id").value === id.toString()) {
      resetForm();
    }
  } catch (error) {
    console.error("Fehler beim Löschen:", error.message);
    showMessage("Fehler beim Löschen: " + error.message, true);
  }
}

// --- Admin Map Logic ---
const btnOpenMap = document.getElementById("btn-open-map");
const adminMapModal = document.getElementById("admin-map-modal");
const btnAdminMapCancel = document.getElementById("btn-admin-map-cancel");
const btnAdminMapAccept = document.getElementById("btn-admin-map-accept");
const btnAdminMapSearch = document.getElementById("btn-admin-map-search");
const adminMapSearchInput = document.getElementById("admin-map-search");

let adminMap = null;
let adminMarker = null;
let selectedLatLng = null;

// Nominatim Geocoding function
async function searchAddress() {
  const query = adminMapSearchInput.value.trim();
  if (!query) return;

  btnAdminMapSearch.disabled = true;
  btnAdminMapSearch.textContent = "Sucht...";

  try {
    const response = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
        encodeURIComponent(query),
      {
        headers: { "User-Agent": "Solargrafie-Map-Admin" },
      },
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const newLatLng = [lat, lon];

      adminMap.setView(newLatLng, 13);
      if (adminMarker) {
        adminMarker.setLatLng(newLatLng);
      } else {
        adminMarker = L.marker(newLatLng, { draggable: true }).addTo(adminMap);
        adminMarker.on("dragend", function (event) {
          selectedLatLng = event.target.getLatLng();
        });
      }
      selectedLatLng = L.latLng(lat, lon);
    } else {
      alert("Keine Resultate gefunden.");
    }
  } catch (error) {
    console.error("Geocoding Error:", error);
    alert("Fehler bei der Adresssuche.");
  } finally {
    btnAdminMapSearch.disabled = false;
    btnAdminMapSearch.textContent = "Suchen";
  }
}

// Open modal and init map
btnOpenMap.addEventListener("click", () => {
  adminMapModal.classList.remove("hidden");

  const currentLat = parseFloat(document.getElementById("lat").value);
  const currentLng = parseFloat(document.getElementById("lng").value);

  let startLatLng = [46.8, 8.2]; // Schweiz Default
  let startZoom = 7;
  let placeMarker = false;

  if (!isNaN(currentLat) && !isNaN(currentLng)) {
    startLatLng = [currentLat, currentLng];
    startZoom = 13;
    placeMarker = true;
    selectedLatLng = L.latLng(currentLat, currentLng);
  } else {
    selectedLatLng = null;
  }

  if (!adminMap) {
    // Initialisiere die Karte
    adminMap = L.map("admin-map").setView(startLatLng, startZoom);

    // Wir nutzen den Standard OpenStreetMap layer wie im Haupt-Frontend
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(adminMap);

    adminMap.on("click", function (e) {
      if (!adminMarker) {
        adminMarker = L.marker(e.latlng, { draggable: true }).addTo(adminMap);
        adminMarker.on("dragend", function (event) {
          selectedLatLng = event.target.getLatLng();
        });
      } else {
        adminMarker.setLatLng(e.latlng);
      }
      selectedLatLng = e.latlng;
    });
  } else {
    adminMap.setView(startLatLng, startZoom);
    adminMap.invalidateSize();
  }

  // Handle marker based on existing values
  if (placeMarker) {
    if (!adminMarker) {
      adminMarker = L.marker(startLatLng, { draggable: true }).addTo(adminMap);
      adminMarker.on("dragend", function (event) {
        selectedLatLng = event.target.getLatLng();
      });
    } else {
      adminMarker.setLatLng(startLatLng);
    }
  } else {
    if (adminMarker) {
      adminMap.removeLayer(adminMarker);
      adminMarker = null;
    }
  }
});

btnAdminMapCancel.addEventListener("click", () => {
  adminMapModal.classList.add("hidden");
});

btnAdminMapAccept.addEventListener("click", () => {
  if (selectedLatLng) {
    document.getElementById("lat").value = selectedLatLng.lat.toFixed(6);
    document.getElementById("lng").value = selectedLatLng.lng.toFixed(6);
  }
  adminMapModal.classList.add("hidden");
});

btnAdminMapSearch.addEventListener("click", searchAddress);
adminMapSearchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchAddress();
  }
});
// --- End Admin Map Logic ---

// Tab Navigation Logik
function switchTab(tabId) {
  // Hide alle Tabs
  tabSolargrafien.classList.add("hidden");
  tabTranslations.classList.add("hidden");
  tabUsers.classList.add("hidden");

  // Reset Buttons
  tabBtnSolargrafien.classList.replace("btn", "btn-secondary");
  tabBtnTranslations.classList.replace("btn", "btn-secondary");
  tabBtnUsers.classList.replace("btn", "btn-secondary");

  if (tabId === "solargrafien") {
    tabSolargrafien.classList.remove("hidden");
    tabBtnSolargrafien.classList.replace("btn-secondary", "btn");
    loadData();
  } else if (tabId === "translations") {
    tabTranslations.classList.remove("hidden");
    tabBtnTranslations.classList.replace("btn-secondary", "btn");
    loadTranslations();
  } else if (tabId === "users") {
    tabUsers.classList.remove("hidden");
    tabBtnUsers.classList.replace("btn-secondary", "btn");
    loadAdmins();
  }
}

tabBtnSolargrafien.addEventListener("click", () => switchTab("solargrafien"));
tabBtnTranslations.addEventListener("click", () => switchTab("translations"));
tabBtnUsers.addEventListener("click", () => switchTab("users"));

// ----------------------------------------------------
// TRANSLATIONS CRUD LOGIK
// ----------------------------------------------------

const translationsList = document.getElementById("translations-list");
const translationForm = document.getElementById("translation-form");
const btnNewTranslation = document.getElementById("btn-new-translation");
const btnRefreshTranslations = document.getElementById(
  "btn-refresh-translations",
);
const btnCancelTranslation = document.getElementById("btn-cancel-translation");
const formTitleTranslation = document.getElementById("form-title-translation");

async function loadTranslations() {
  translationsList.innerHTML = "<p>Lade Übersetzungen...</p>";
  try {
    const { data, error } = await supabaseClient
      .from("translations")
      .select("*");

    if (error) throw error;
    renderTranslationsList(data);
  } catch (error) {
    console.error("Fehler beim Laden der Übersetzungen:", error);
    translationsList.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
  }
}

function renderTranslationsList(data) {
  translationsList.innerHTML = "";
  if (data.length === 0) {
    translationsList.innerHTML = "<p>Keine Übersetzungen gefunden.</p>";
    return;
  }

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-item";

    const infoDiv = document.createElement("div");
    infoDiv.innerHTML = `<strong>${item.key}</strong> - DE: ${item.de ? item.de.substring(0, 30) + "..." : ""}`;

    const actionDiv = document.createElement("div");
    actionDiv.className = "list-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-small";
    btnEdit.textContent = "Bearbeiten";
    btnEdit.onclick = () => editTranslation(item);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-small btn-secondary";
    btnDelete.textContent = "Löschen";
    btnDelete.onclick = () => deleteTranslation(item.key);

    actionDiv.appendChild(btnEdit);
    actionDiv.appendChild(btnDelete);

    div.appendChild(infoDiv);
    div.appendChild(actionDiv);
    translationsList.appendChild(div);
  });
}

function editTranslation(item) {
  formTitleTranslation.textContent = "Übersetzung bearbeiten";
  btnCancelTranslation.classList.remove("hidden");

  document.getElementById("edit-id-translation").value = item.key;
  document.getElementById("trans-key").value = item.key || "";
  document.getElementById("trans-de").value = item.de || "";
  document.getElementById("trans-en").value = item.en || "";
  document.getElementById("trans-fr").value = item.fr || "";
  document.getElementById("trans-it").value = item.it || "";
  document.getElementById("trans-uk").value = item.uk || "";
  document.getElementById("trans-ru").value = item.ru || "";
  document.getElementById("trans-es").value = item.es || "";

  document.getElementById("trans-key").scrollIntoView({ behavior: "smooth" });
}

async function deleteTranslation(id) {
  if (!confirm("Diese Übersetzung wirklich löschen?")) return;

  showMessage("Lösche...");
  try {
    const { error } = await supabaseClient
      .from("translations")
      .delete()
      .eq("key", id);

    if (error) throw error;
    showMessage("Übersetzung erfolgreich gelöscht.");
    loadTranslations();
  } catch (error) {
    showMessage("Fehler beim Löschen: " + error.message, true);
  }
}

translationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("edit-id-translation").value;
  const payload = {
    key: document.getElementById("trans-key").value,
    de: document.getElementById("trans-de").value,
    en: document.getElementById("trans-en").value,
    fr: document.getElementById("trans-fr").value,
    it: document.getElementById("trans-it").value,
    uk: document.getElementById("trans-uk").value,
    ru: document.getElementById("trans-ru").value,
    es: document.getElementById("trans-es").value,
  };

  showMessage("Speichere...");

  try {
    if (id) {
      // UPDATE
      const { error } = await supabaseClient
        .from("translations")
        .update(payload)
        .eq("key", id);
      if (error) throw error;
      showMessage("Übersetzung aktualisiert.");
    } else {
      // INSERT
      const { error } = await supabaseClient
        .from("translations")
        .insert([payload]);
      if (error) throw error;
      showMessage("Übersetzung erstellt.");
    }

    translationForm.reset();
    document.getElementById("edit-id-translation").value = "";
    formTitleTranslation.textContent = "Neue Übersetzung";
    btnCancelTranslation.classList.add("hidden");
    loadTranslations();
  } catch (error) {
    showMessage("Fehler beim Speichern: " + error.message, true);
  }
});

btnNewTranslation.addEventListener("click", () => {
  translationForm.reset();
  document.getElementById("edit-id-translation").value = "";
  formTitleTranslation.textContent = "Neue Übersetzung";
  btnCancelTranslation.classList.add("hidden");
});

btnRefreshTranslations.addEventListener("click", () => {
  loadTranslations();
});

btnCancelTranslation.addEventListener("click", () => {
  translationForm.reset();
  document.getElementById("edit-id-translation").value = "";
  formTitleTranslation.textContent = "Neue Übersetzung";
  btnCancelTranslation.classList.add("hidden");
});

// ----------------------------------------------------
// USERS (ADMINS) CRUD LOGIK
// ----------------------------------------------------

const usersList = document.getElementById("users-list");
const userForm = document.getElementById("user-form");
const btnNewUser = document.getElementById("btn-new-user");
const btnRefreshUsers = document.getElementById("btn-refresh-users");
const btnCancelUser = document.getElementById("btn-cancel-user");
const formTitleUser = document.getElementById("form-title-user");

async function loadAdmins() {
  usersList.innerHTML = "<p>Lade Benutzer...</p>";
  try {
    const { data, error } = await supabaseClient.from("admins").select("*");

    if (error) throw error;
    renderAdminsList(data);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer:", error);
    usersList.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
  }
}

function renderAdminsList(data) {
  usersList.innerHTML = "";
  if (data.length === 0) {
    usersList.innerHTML = "<p>Keine Benutzer gefunden.</p>";
    return;
  }

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-item";

    const infoDiv = document.createElement("div");
    infoDiv.innerHTML = `<strong>${item.email}</strong> - Rolle: ${item.rolle}`;

    const actionDiv = document.createElement("div");
    actionDiv.className = "list-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-small";
    btnEdit.textContent = "Bearbeiten";
    btnEdit.onclick = () => editAdmin(item);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-small btn-secondary";
    btnDelete.textContent = "Löschen";
    btnDelete.onclick = () => deleteAdmin(item.email);

    actionDiv.appendChild(btnEdit);
    actionDiv.appendChild(btnDelete);

    div.appendChild(infoDiv);
    div.appendChild(actionDiv);
    usersList.appendChild(div);
  });
}

function editAdmin(item) {
  formTitleUser.textContent = "Benutzer bearbeiten";
  btnCancelUser.classList.remove("hidden");

  document.getElementById("edit-id-user").value = item.email;
  document.getElementById("user-email-input").value = item.email || "";
  document.getElementById("user-rolle").value = item.rolle || "erfasser";

  document
    .getElementById("user-email-input")
    .scrollIntoView({ behavior: "smooth" });
}

async function deleteAdmin(id) {
  if (!confirm("Diesen Benutzer wirklich löschen?")) return;

  showMessage("Lösche...");
  try {
    const { error } = await supabaseClient
      .from("admins")
      .delete()
      .eq("email", id);

    if (error) throw error;
    showMessage("Benutzer erfolgreich gelöscht.");
    loadAdmins();
  } catch (error) {
    showMessage("Fehler beim Löschen: " + error.message, true);
  }
}

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("edit-id-user").value;
  const payload = {
    email: document.getElementById("user-email-input").value,
    rolle: document.getElementById("user-rolle").value,
  };

  showMessage("Speichere...");

  try {
    if (id) {
      // UPDATE
      const { error } = await supabaseClient
        .from("admins")
        .update(payload)
        .eq("email", id);
      if (error) throw error;
      showMessage("Benutzer aktualisiert.");
    } else {
      // INSERT
      const { error } = await supabaseClient.from("admins").insert([payload]);
      if (error) throw error;
      showMessage("Benutzer erstellt.");
    }

    userForm.reset();
    document.getElementById("edit-id-user").value = "";
    formTitleUser.textContent = "Neuer Benutzer";
    btnCancelUser.classList.add("hidden");
    loadAdmins();
  } catch (error) {
    showMessage("Fehler beim Speichern: " + error.message, true);
  }
});

btnNewUser.addEventListener("click", () => {
  userForm.reset();
  document.getElementById("edit-id-user").value = "";
  formTitleUser.textContent = "Neuer Benutzer";
  btnCancelUser.classList.add("hidden");
});

btnRefreshUsers.addEventListener("click", () => {
  loadAdmins();
});

btnCancelUser.addEventListener("click", () => {
  userForm.reset();
  document.getElementById("edit-id-user").value = "";
  formTitleUser.textContent = "Neuer Benutzer";
  btnCancelUser.classList.add("hidden");
});

// Search functionality

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const items = solargrafienList.querySelectorAll(".list-item");

    items.forEach((item) => {
      const titel = item.dataset.titel || "";
      const owner = item.dataset.owner || "";

      if (titel.includes(searchTerm) || owner.includes(searchTerm)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  });
}
