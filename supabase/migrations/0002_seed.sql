-- Tête de la silsila. Garder en phase avec src/lib/data/seed.ts.
-- Les rattachements incertains restent vides : un admin les complète ensuite.

insert into public.persons (id, kind, full_name, mouqaddam_id, biography_slug) values
  ('00000000-0000-4000-8000-000000000001', 'prophet', 'Le Prophète Muhammad ﷺ', null, null),
  ('00000000-0000-4000-8000-000000000002', 'cheikh', 'Cheikh Ahmad Tijani', '00000000-0000-4000-8000-000000000001', 'ahmad-tijani'),
  ('00000000-0000-4000-8000-000000000003', 'cheikh', 'Sidi Ali Harazem Berrada', '00000000-0000-4000-8000-000000000002', 'ali-harazem'),
  ('00000000-0000-4000-8000-000000000004', 'cheikh', 'Sidi Muhammad al-Ghali', '00000000-0000-4000-8000-000000000002', null),
  ('00000000-0000-4000-8000-000000000005', 'cheikh', 'El Hadj Omar Tall', '00000000-0000-4000-8000-000000000004', 'omar-tall'),
  ('00000000-0000-4000-8000-000000000006', 'cheikh', 'El Hadj Malick Sy', null, 'malick-sy'),
  ('00000000-0000-4000-8000-000000000007', 'cheikh', 'Cheikh Abdoulaye Niasse', null, 'abdoulaye-niasse'),
  ('00000000-0000-4000-8000-000000000008', 'cheikh', 'Cheikh Ibrahima Niasse', '00000000-0000-4000-8000-000000000007', 'ibrahima-niasse');
