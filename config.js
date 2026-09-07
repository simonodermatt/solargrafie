const APP_CONFIG = {
  // 1. Google Sheets Anbindung
  sheetId: "1zny1pBIQilY5wJXTN8eYEdIBoW3lJp9W13mKceeZbKI",

  // Tabellenblatt-Name
  sheetRange: "Formularantworten 1",

  // Optional: Google Cloud API-Key
  // Falls eingetragen, nutzt die Seite die offizielle Google Sheets v4 REST-API.
  // Bleibt der String leer (""), wird automatisch der CORS-freie GViz-Modus genutzt.
  googleApiKey: "",

  // Optional: Eigener Server-Proxy / Cloudflare Worker Endpunkt
  customApiUrl: "",

  // 2. Split-Hosting der Bilder
  // Lokaler Pfad, wenn in der Tabelle nur "mein-bild.jpg" eingetragen ist:
  localImageFolder: "./Bilder/",

  // 3. Start-Voreinstellungen
  defaultRegion: "ch",
  defaultLanguage: "de"
};