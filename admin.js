// Initialisiere Supabase
const supabaseClient = supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY,
);

// DOM Elemente
const loadingContainer = document.getElementById("loading-container");
const loginContainer = document.getElementById("login-container");
const dashboardContainer = document.getElementById("dashboard-container");
const userEmailSpan = document.getElementById("user-email");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");

// UI Update Logik
function updateUI(session) {
  loadingContainer.classList.add("hidden");

  if (session) {
    // User ist eingeloggt
    loginContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    userEmailSpan.textContent = session.user.email;
    loadSolargrafien();
  } else {
    // User ist NICHT eingeloggt
    dashboardContainer.classList.add("hidden");
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

// DOM Elemente CRUD
const solargrafienList = document.getElementById("solargrafien-list");
const solargrafieForm = document.getElementById("solargrafie-form");
const statusMessage = document.getElementById("status-message");
const btnNew = document.getElementById("btn-new");
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

    // Fallback für undefinierte Werte
    const placedDate = item.placed ? item.placed : "Unbekannt";
    const title = item.titel ? item.titel : "Ohne Titel";

    // Thumbnail Fallback (z.B. ein Platzhalter, falls keine URL vorhanden ist)
    const imgUrl = item.bild_url
      ? escapeHtml(resolveImageUrl(item.bild_url))
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="%23bec8d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

    div.innerHTML = `
      <div class="list-item-content">
        <img src="${imgUrl}" alt="Thumbnail" class="list-item-thumbnail" loading="lazy">
        <div class="list-item-info">
          <strong>${escapeHtml(title)}</strong>
          <span>Placed: ${escapeHtml(placedDate)}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-small btn-edit" data-id="${item.id}">Edit</button>
        <button class="btn btn-small btn-danger btn-delete" data-id="${item.id}">Delete</button>
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
  document.getElementById("lat").value = item.lat ?? "";
  document.getElementById("lng").value = item.lng ?? "";
  document.getElementById("placed").value = item.placed || "";
  document.getElementById("opened").value = item.opened || "";
  document.getElementById("kamera").value = item.kamera || "";
  document.getElementById("fotopapier").value = item.fotopapier || "";
  document.getElementById("bild_url").value = item.bild_url || "";
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

  // UI anpassen
  formTitle.textContent = "Neuer Eintrag erstellen";
  btnSubmit.textContent = "Speichern";
  btnCancel.classList.add("hidden");
}

btnNew.addEventListener("click", resetForm);
btnCancel.addEventListener("click", resetForm);

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
  const record = {
    titel: getValue("titel"),
    lat: latVal === "" ? null : parseFloat(latVal),
    lng: lngVal === "" ? null : parseFloat(lngVal),
    placed: getValue("placed"),
    opened: getValue("opened"),
    kamera: getValue("kamera"),
    fotopapier: getValue("fotopapier"),
    bild_url: getValue("bild_url"),
    comment_status: document.getElementById("comment_status").value,
  };

  const notizenVal = getValue("notizen");
  record.status = notizenVal;

  try {
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
