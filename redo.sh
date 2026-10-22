#!/bin/bash
sed -i 's/<script src="config.js"><\/script>/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js@2"><\/script>\n    <script src="config.js"><\/script>/' index.html

sed -i '/window.translations = {};/a \
      window.mapMarkers = {};\
      const cfg = typeof APP_CONFIG !== "undefined" ? APP_CONFIG : {};\
      const supabaseClient = (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && typeof supabase !== "undefined") ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;' index.html
