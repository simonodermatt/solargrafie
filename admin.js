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
