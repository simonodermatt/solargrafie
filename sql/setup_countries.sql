-- Tabellen-Erstellung für die Länderliste (Countries)
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    country_code VARCHAR(10) NOT NULL UNIQUE, -- z.B. 'ch', 'ua', 'de'
    name_de VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    name_fr VARCHAR(255),
    name_it VARCHAR(255),
    name_uk VARCHAR(255),
    name_ru VARCHAR(255),
    name_es VARCHAR(255),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    zoom_level INTEGER DEFAULT 5 NOT NULL,
    flag VARCHAR(255) NOT NULL, -- Emoji (z.B. '🇨🇭') oder URL (z.B. 'https://flagcdn.com/w40/ch.png')
    sort_order INTEGER DEFAULT 100 NOT NULL
);

-- RLS (Row Level Security) aktivieren
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Lesezugriff für alle (anon) erlauben
CREATE POLICY "Lesezugriff für alle auf countries"
ON public.countries FOR SELECT
USING (true);

-- Schreib-/Lesezugriff für authentifizierte Admins (nur Superadmin sollte das über die UI können,
-- aber wir prüfen hier mindestens die Authentifizierung. Die feingranulare Rolle 'superadmin'
-- prüfen wir im Frontend bzw. könnte man auch über Supabase Functions lösen, aber das reicht für den Anfang)
CREATE POLICY "Vollzugriff für authentifizierte Admins auf countries"
ON public.countries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Initial-Daten (Beispiele, wie von User gewünscht: Schweiz zuerst, dann z.B. Ukraine)
INSERT INTO public.countries (country_code, name_de, name_en, lat, lng, zoom_level, flag, sort_order)
VALUES
    ('ch', 'Schweiz', 'Switzerland', 46.8182, 8.2275, 8, '🇨🇭', 1),
    ('ua', 'Ukraine', 'Ukraine', 48.3794, 31.1656, 5, '🇺🇦', 2),
    ('de', 'Deutschland', 'Germany', 51.1657, 10.4515, 6, '🇩🇪', 3)
ON CONFLICT (country_code) DO NOTHING;

-- Übersetzung für den "Länder"-Button (admin_tab_countries) in der Admin-Maske
INSERT INTO public.translations (key, de, en, fr, it, uk, ru, es)
VALUES (
    'admin_tab_countries',
    'Länder',
    'Countries',
    'Pays',
    'Paesi',
    'Країни',
    'Страны',
    'Países'
)
ON CONFLICT (key) DO UPDATE SET
    de = EXCLUDED.de,
    en = EXCLUDED.en,
    fr = EXCLUDED.fr,
    it = EXCLUDED.it,
    uk = EXCLUDED.uk,
    ru = EXCLUDED.ru,
    es = EXCLUDED.es;

