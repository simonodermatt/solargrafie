-- =====================================================================
-- Security Hardening Solargrafie  (im Supabase SQL-Editor ausführen)
-- 1) E-Mail-Adressen nicht mehr öffentlich lesbar (nDSG / DSGVO)
-- 2) Schreibrechte nur für eingeloggte Admins (serverseitig, nicht nur UI)
-- WICHTIG: ZUERST das neue Frontend (index.html) deployen, das keine
--          "select *" mehr auf solargrafien macht – sonst bricht die Karte.
-- =====================================================================

-- ---- 1) Spaltenrechte: anon darf alles ausser "email" lesen ----------
REVOKE SELECT ON public.solargrafien FROM anon;
GRANT SELECT (
  id, zeitstempel, titel, lat, lng, status, placed, opened,
  comment_status, bild_url, google_fotos_url, externe_id, kamera,
  fotopapier, owner, bild_haupt, bild_doku, bild_raw, bild_thumbnail,
  tage_belichtung, tage_verdeckt, sichtbare_boegen,
  sonnenhoehe_max, sonnenhoehe_min
) ON public.solargrafien TO anon;
-- Eingeloggte Admins behalten vollen Zugriff (inkl. email)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solargrafien TO authenticated;

-- ---- 2) Hilfsfunktion: Rolle des eingeloggten Admins -----------------
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.rolle
  FROM public.admins a
  WHERE a.email = (auth.jwt() ->> 'email')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_admin_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

-- ---- 3) RLS-Policies (alte Schreib-Policies vorher prüfen/löschen!) --
-- Kontrolle: SELECT * FROM pg_policies WHERE schemaname='public';
ALTER TABLE public.admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solargrafien  ENABLE ROW LEVEL SECURITY;

-- admins: nur Superadmin darf lesen/schreiben; jeder Admin sieht sich selbst
DROP POLICY IF EXISTS "hardening admins select" ON public.admins;
CREATE POLICY "hardening admins select" ON public.admins FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email') OR public.current_admin_role() = 'superadmin');
DROP POLICY IF EXISTS "hardening admins write" ON public.admins;
CREATE POLICY "hardening admins write" ON public.admins FOR ALL
  TO authenticated
  USING (public.current_admin_role() = 'superadmin')
  WITH CHECK (public.current_admin_role() = 'superadmin');

-- translations / countries: Lesen öffentlich, Schreiben nur Superadmin
DROP POLICY IF EXISTS "hardening translations write" ON public.translations;
CREATE POLICY "hardening translations write" ON public.translations FOR ALL
  TO authenticated
  USING (public.current_admin_role() = 'superadmin')
  WITH CHECK (public.current_admin_role() = 'superadmin');

DROP POLICY IF EXISTS "hardening countries write" ON public.countries;
CREATE POLICY "hardening countries write" ON public.countries FOR ALL
  TO authenticated
  USING (public.current_admin_role() = 'superadmin')
  WITH CHECK (public.current_admin_role() = 'superadmin');

-- solargrafien: Lesen öffentlich; Superadmin alles, Erfasser nur eigene (email)
DROP POLICY IF EXISTS "hardening solargrafien write super" ON public.solargrafien;
CREATE POLICY "hardening solargrafien write super" ON public.solargrafien FOR ALL
  TO authenticated
  USING (public.current_admin_role() = 'superadmin')
  WITH CHECK (public.current_admin_role() = 'superadmin');

DROP POLICY IF EXISTS "hardening solargrafien write erfasser" ON public.solargrafien;
CREATE POLICY "hardening solargrafien write erfasser" ON public.solargrafien FOR ALL
  TO authenticated
  USING (public.current_admin_role() = 'erfasser' AND email = (auth.jwt() ->> 'email'))
  WITH CHECK (public.current_admin_role() = 'erfasser' AND email = (auth.jwt() ->> 'email'));

-- Öffentliches Lesen (falls noch nicht vorhanden)
DROP POLICY IF EXISTS "hardening solargrafien read" ON public.solargrafien;
CREATE POLICY "hardening solargrafien read" ON public.solargrafien FOR SELECT
  TO anon, authenticated USING (true);

-- ---- 4) Constraints (Datenqualität) ----------------------------------
ALTER TABLE public.solargrafien
  DROP CONSTRAINT IF EXISTS solargrafien_lat_chk,
  DROP CONSTRAINT IF EXISTS solargrafien_lng_chk;
ALTER TABLE public.solargrafien
  ADD CONSTRAINT solargrafien_lat_chk CHECK (lat BETWEEN -90 AND 90),
  ADD CONSTRAINT solargrafien_lng_chk CHECK (lng BETWEEN -180 AND 180);

-- ---- 5) Storage: nur Admins dürfen schreiben/löschen -----------------
-- Bucket "solargrafien-bilder" bleibt öffentlich lesbar.
DROP POLICY IF EXISTS "hardening storage write" ON storage.objects;
CREATE POLICY "hardening storage write" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'solargrafien-bilder' AND public.current_admin_role() IS NOT NULL)
  WITH CHECK (bucket_id = 'solargrafien-bilder' AND public.current_admin_role() IS NOT NULL);

-- ---- Verifikation (als anon, z.B. per curl) --------------------------
--   GET /rest/v1/solargrafien?select=email  -> muss 401/403 liefern
--   GET /rest/v1/solargrafien?select=titel  -> muss Daten liefern
