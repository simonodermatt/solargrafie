-- =====================================================================
-- Security Hardening Solargrafie  (Supabase SQL-Editor, in einem Rutsch)
-- Basiert auf dem tatsächlichen pg_policies-Ist-Stand vom 2026-11-19.
--
-- Befunde im Ist-Stand:
--  (A) KRITISCH: countries hat "Vollzugriff ... authenticated USING true".
--      Jeder, der sich mit irgendeinem Google-Konto anmeldet, ist
--      "authenticated" und könnte Länder ändern/löschen.
--  (B) email-Spalte in solargrafien ist für anon lesbar (Personendaten).
--  (C) solargrafien UPDATE/DELETE: "OR email = eigene E-Mail" gilt auch für
--      Nicht-Admins (jeder Google-Nutzer, dessen Adresse in einer Zeile steht).
--  (D) Storage-Policies sind nicht in dieser Liste -> unten setzen.
--  (E) Doppelte/redundante SELECT-Policies auf translations/admins.
--
-- WICHTIG: ZUERST das neue Frontend (index.html ohne select "*") deployen,
--          erst DANN diesen Block ausführen, sonst bricht die Karte.
-- =====================================================================
BEGIN;

-- ---- Hilfsfunktionen (SECURITY DEFINER, fester search_path) ----------
CREATE OR REPLACE FUNCTION public.ist_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = (auth.jwt() ->> 'email')
      -- Nur Google-Login zählt (app_metadata ist für Nutzer NICHT änderbar).
      -- Verhindert Übernahme einer Admin-Adresse per E-Mail/Passwort-Signup.
      AND (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
      AND coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) AND a.rolle = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.ist_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = (auth.jwt() ->> 'email')
      -- Nur Google-Login zählt (app_metadata ist für Nutzer NICHT änderbar).
      -- Verhindert Übernahme einer Admin-Adresse per E-Mail/Passwort-Signup.
      AND (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
      AND coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false)
  );
$$;

REVOKE ALL ON FUNCTION public.ist_superadmin() FROM public, anon;
REVOKE ALL ON FUNCTION public.ist_admin()      FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ist_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ist_admin()      TO authenticated;

-- ---- (B) email nicht mehr öffentlich lesbar --------------------------
REVOKE SELECT ON public.solargrafien FROM anon;
GRANT SELECT (
  id, zeitstempel, titel, lat, lng, status, placed, opened,
  comment_status, bild_url, google_fotos_url, externe_id, kamera,
  fotopapier, owner, bild_haupt, bild_doku, bild_raw, bild_thumbnail,
  tage_belichtung, tage_verdeckt, sichtbare_boegen,
  sonnenhoehe_max, sonnenhoehe_min
) ON public.solargrafien TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solargrafien TO authenticated;

-- ---- solargrafien: alte Policies ersetzen ----------------------------
DROP POLICY IF EXISTS "Admins einfuegen Solargrafien"        ON public.solargrafien;
DROP POLICY IF EXISTS "Rollenbasiertes Aendern Solargrafien" ON public.solargrafien;
DROP POLICY IF EXISTS "Rollenbasiertes Loeschen Solargrafien" ON public.solargrafien;
DROP POLICY IF EXISTS "Lesezugriff Solargrafien alle"        ON public.solargrafien;

CREATE POLICY "sg read all" ON public.solargrafien
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "sg insert admins" ON public.solargrafien
  FOR INSERT TO authenticated
  WITH CHECK (
    public.ist_superadmin()
    OR (public.ist_admin() AND email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "sg update admins" ON public.solargrafien
  FOR UPDATE TO authenticated
  USING (
    public.ist_superadmin()
    OR (public.ist_admin() AND email = (auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    public.ist_superadmin()
    OR (public.ist_admin() AND email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "sg delete admins" ON public.solargrafien
  FOR DELETE TO authenticated
  USING (
    public.ist_superadmin()
    OR (public.ist_admin() AND email = (auth.jwt() ->> 'email'))
  );

-- ---- (A) countries: nur Superadmin darf schreiben --------------------
DROP POLICY IF EXISTS "Vollzugriff für authentifizierte Admins auf countries" ON public.countries;
DROP POLICY IF EXISTS "Lesezugriff für alle auf countries"                    ON public.countries;

CREATE POLICY "countries read all" ON public.countries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "countries write superadmin" ON public.countries
  FOR ALL TO authenticated
  USING (public.ist_superadmin()) WITH CHECK (public.ist_superadmin());

-- ---- (E) translations / admins: Duplikate bereinigen -----------------
-- (Schreib-Policies mit ist_superadmin() bleiben unverändert bestehen.)
DROP POLICY IF EXISTS "Lesezugriff Solargrafien alle"          ON public.translations;
DROP POLICY IF EXISTS "Öffentlicher Lesezugriff Übersetzungen" ON public.translations;
-- "Lesezugriff Übersetzungen alle" (public, true) bleibt als einzige Leserichtlinie.

DROP POLICY IF EXISTS "Admins lesen Admins" ON public.admins;
-- "Admins Lesezugriff" (eigene Zeile ODER Superadmin) bleibt.

-- ---- Datenqualität ---------------------------------------------------
ALTER TABLE public.solargrafien
  DROP CONSTRAINT IF EXISTS solargrafien_lat_chk,
  DROP CONSTRAINT IF EXISTS solargrafien_lng_chk;
ALTER TABLE public.solargrafien
  ADD CONSTRAINT solargrafien_lat_chk CHECK (lat BETWEEN -90 AND 90),
  ADD CONSTRAINT solargrafien_lng_chk CHECK (lng BETWEEN -180 AND 180);

-- ---- (D) Storage: Lesen öffentlich, Schreiben nur Admins -------------
DROP POLICY IF EXISTS "hardening storage write" ON storage.objects;
CREATE POLICY "hardening storage write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'solargrafien-bilder' AND public.ist_admin())
  WITH CHECK (bucket_id = 'solargrafien-bilder' AND public.ist_admin());
-- Achtung: bestehende (evtl. zu offene) Storage-Policies prüfen:
--   SELECT policyname, roles, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname='storage' AND tablename='objects';

COMMIT;

-- ---- Verifikation -----------------------------------------------------
-- anon:  GET /rest/v1/solargrafien?select=email  -> Fehler 401/403
-- anon:  GET /rest/v1/solargrafien?select=titel  -> Daten
-- Google-Konto, das NICHT in admins steht: INSERT/UPDATE/DELETE auf
--   solargrafien, countries, translations, admins -> alles abgelehnt
-- Erfasser: nur eigene Zeilen änderbar; Superadmin: alles
