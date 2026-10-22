import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the fetch block in fetchSolargrafieDaten
old_fetch_block = """      async function fetchSolargrafieDaten() {
        const cfg = typeof APP_CONFIG !== "undefined" ? APP_CONFIG : {};

        if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
          console.warn(
            "Supabase credentials not configured. Cannot fetch solargrafieDaten.",
          );
          return;
        }

        try {
          const apiUrl = `${cfg.SUPABASE_URL}/rest/v1/solargrafien?select=*`;
          const headers = {
            apikey: cfg.SUPABASE_ANON_KEY,
            Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          };

          const res = await fetch(apiUrl, {
            headers: headers,
            cache: "no-store",
          });
          if (!res.ok) {
            throw new Error("HTTP error " + res.status);
          }
          const data = await res.json();"""

new_fetch_block = """      async function fetchSolargrafieDaten() {
        if (!supabaseClient) {
          console.warn(
            "Supabase credentials not configured. Cannot fetch solargrafieDaten.",
          );
          return;
        }

        try {
          const { data, error } = await supabaseClient.from('solargrafien').select('*');
          if (error) {
            throw new Error(error.message);
          }"""

new_content = content.replace(old_fetch_block, new_fetch_block)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(new_content)
