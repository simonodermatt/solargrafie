-- =====================================================================
-- Datenmodell Schritt 1: Constraints, Audit-Spalten, numerische Typen
-- Idempotent und defensiv: jeder Schritt prüft zuerst die vorhandenen Daten.
-- Vorher empfohlen: Backup (Supabase Dashboard -> Database -> Backups).
-- Geprüft am 2026-11-19 (anon-Lesezugriff): 22 Einträge, keine NULL in
-- titel/lat/lng, kein placed > opened, alle sonnenhoehe_* numerisch,
-- keine doppelten translation-Keys.
-- =====================================================================
BEGIN;

-- ---- 1) Constraints ---------------------------------------------------
DO $$
BEGIN
  -- translations.key eindeutig
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.translations'::regclass AND contype IN ('u','p')
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid='public.translations'::regclass AND attname='key')]
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='translations'
      AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(key)%'
  ) THEN
    IF EXISTS (SELECT key FROM public.translations GROUP BY key HAVING count(*) > 1) THEN
      RAISE EXCEPTION 'translations.key hat Duplikate - bitte zuerst bereinigen';
    END IF;
    ALTER TABLE public.translations ADD CONSTRAINT translations_key_unique UNIQUE (key);
  END IF;

  -- Pflichtfelder
  IF NOT EXISTS (SELECT 1 FROM public.solargrafien
                 WHERE titel IS NULL OR lat IS NULL OR lng IS NULL) THEN
    ALTER TABLE public.solargrafien
      ALTER COLUMN titel SET NOT NULL,
      ALTER COLUMN lat   SET NOT NULL,
      ALTER COLUMN lng   SET NOT NULL;
  ELSE
    RAISE NOTICE 'NOT NULL uebersprungen: es gibt Zeilen ohne titel/lat/lng';
  END IF;
END $$;

-- Zeitfenster plausibel: opened nicht vor placed
ALTER TABLE public.solargrafien DROP CONSTRAINT IF EXISTS solargrafien_dates_chk;
ALTER TABLE public.solargrafien
  ADD CONSTRAINT solargrafien_dates_chk
  CHECK (opened IS NULL OR placed IS NULL OR opened >= placed);

-- ---- 2) Audit-Spalten -------------------------------------------------
-- created_by entfällt: "email" ist bereits der Ersteller (Policy-Basis).
ALTER TABLE public.solargrafien
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by text;
-- Alte Zeilen bleiben bewusst NULL ("unbekannt"), neue bekommen now().
ALTER TABLE public.solargrafien ALTER COLUMN created_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.solargrafien_audit()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := coalesce(NEW.created_at, now());
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := coalesce(auth.jwt() ->> 'email', current_user);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solargrafien_audit ON public.solargrafien;
CREATE TRIGGER trg_solargrafien_audit
  BEFORE INSERT OR UPDATE ON public.solargrafien
  FOR EACH ROW EXECUTE FUNCTION public.solargrafien_audit();

-- Audit-Spalten nicht öffentlich: anon-Grants bleiben bewusst unverändert
-- (Spaltenliste in security_hardening.sql enthält sie nicht).

-- ---- 3) Sonnenhöhe als Zahl -------------------------------------------
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['sonnenhoehe_max','sonnenhoehe_min'] LOOP
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='solargrafien' AND column_name=c)
       IN ('text','character varying') THEN
      EXECUTE format(
        'ALTER TABLE public.solargrafien ALTER COLUMN %I TYPE numeric(6,2) USING NULLIF(trim(%I), '''')::numeric',
        c, c);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---- Kontrolle --------------------------------------------------------
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='solargrafien' ORDER BY ordinal_position;
-- Rollback-Hinweis: DROP TRIGGER trg_solargrafien_audit ON public.solargrafien;
--   ALTER TABLE public.solargrafien DROP COLUMN created_at, DROP COLUMN updated_at, DROP COLUMN updated_by;
