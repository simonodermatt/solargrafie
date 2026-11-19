-- Neue Admin-Übersetzungen (idempotent: fügt nur fehlende Keys ein)
INSERT INTO public.translations (key, de, en, fr, it, uk, ru, es)
SELECT v.* FROM (VALUES
  ('admin_status_checking', 'Status wird geprüft...', 'Checking status...', 'Vérification du statut...', 'Verifica dello stato...', 'Перевірка статусу...', 'Проверка статуса...', 'Comprobando estado...'),
  ('admin_login_hint', 'Bitte melde dich an, um den Administrationsbereich zu betreten.', 'Please sign in to access the administration area.', 'Veuillez vous connecter pour accéder à l''espace d''administration.', 'Accedi per entrare nell''area di amministrazione.', 'Увійдіть, щоб отримати доступ до адміністративної частини.', 'Войдите, чтобы получить доступ к административной части.', 'Inicia sesión para acceder al área de administración.'),
  ('admin_btn_pick_on_map', 'Auf Karte wählen', 'Select on map', 'Choisir sur la carte', 'Scegli sulla mappa', 'Вибрати на карті', 'Выбрать на карте', 'Elegir en el mapa'),
  ('admin_btn_edit', 'Bearbeiten', 'Edit', 'Modifier', 'Modifica', 'Редагувати', 'Редактировать', 'Editar'),
  ('admin_country_form_new', 'Neues Land anlegen', 'Add new country', 'Ajouter un pays', 'Aggiungi un paese', 'Додати країну', 'Добавить страну', 'Añadir país'),
  ('admin_country_form_edit', 'Land bearbeiten', 'Edit country', 'Modifier le pays', 'Modifica paese', 'Редагувати країну', 'Редактировать страну', 'Editar país'),
  ('admin_country_code_label', 'Ländercode (z.B. ch, de, it)', 'Country code (e.g. ch, de, it)', 'Code pays (p. ex. ch, de, it)', 'Codice paese (es. ch, de, it)', 'Код країни (напр. ch, de, it)', 'Код страны (напр. ch, de, it)', 'Código de país (p. ej. ch, de, it)'),
  ('admin_country_flag_label', 'Flagge (Emoji oder SVG-URL)', 'Flag (emoji or SVG URL)', 'Drapeau (emoji ou URL SVG)', 'Bandiera (emoji o URL SVG)', 'Прапор (емодзі або URL SVG)', 'Флаг (эмодзи или URL SVG)', 'Bandera (emoji o URL SVG)'),
  ('admin_country_zoom_label', 'Zoom-Level', 'Zoom level', 'Niveau de zoom', 'Livello di zoom', 'Рівень масштабу', 'Уровень масштаба', 'Nivel de zoom'),
  ('admin_country_sort_label', 'Sortierung (Reihenfolge)', 'Sort order', 'Ordre de tri', 'Ordinamento', 'Порядок сортування', 'Порядок сортировки', 'Orden'),
  ('admin_country_name_label', 'Name', 'Name', 'Nom', 'Nome', 'Назва', 'Название', 'Nombre'),
  ('admin_msg_saving', 'Wird gespeichert...', 'Saving...', 'Enregistrement...', 'Salvataggio...', 'Збереження...', 'Сохранение...', 'Guardando...'),
  ('admin_msg_deleting', 'Lösche...', 'Deleting...', 'Suppression...', 'Eliminazione...', 'Видалення...', 'Удаление...', 'Eliminando...')
) AS v(key, de, en, fr, it, uk, ru, es)
WHERE NOT EXISTS (SELECT 1 FROM public.translations t WHERE t.key = v.key);
