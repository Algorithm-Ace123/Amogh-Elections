-- Seed Data for Fire & Ice

-- Note: In Supabase, if the schema is already created, just run this to seed some demo data

-- Seed Polls
INSERT INTO public.polls (id, question, type, status, pinned) VALUES 
('a0000000-0000-0000-0000-000000000001', 'Should we introduce a 4-day school week?', 'Yes-No', 'Active', true),
('a0000000-0000-0000-0000-000000000002', 'What should be our next major focus area?', 'Opinion', 'Active', false),
('a0000000-0000-0000-0000-000000000003', 'Rank the following campus improvements:', 'Priority', 'Active', false);

-- Seed Poll Options
INSERT INTO public.poll_options (poll_id, option_text, votes) VALUES
('a0000000-0000-0000-0000-000000000001', 'Yes', 120),
('a0000000-0000-0000-0000-000000000001', 'No', 34),

('a0000000-0000-0000-0000-000000000002', 'Better Canteen Food', 45),
('a0000000-0000-0000-0000-000000000002', 'More Study Spaces', 88),
('a0000000-0000-0000-0000-000000000002', 'Relaxed Dress Code', 15),

('a0000000-0000-0000-0000-000000000003', 'Library Upgrade', 10),
('a0000000-0000-0000-0000-000000000003', 'New Sports Equipment', 12),
('a0000000-0000-0000-0000-000000000003', 'Shaded Seating Areas', 8);

-- Seed Tasks
INSERT INTO public.tasks (id, title, focus_area, description, status, priority, assignee, impact_statement) VALUES
('b0000000-0000-0000-0000-000000000001', 'Launch Anonymous Reporting System', 'Student Safety', 'A secure channel for students to report bullying and safety concerns.', 'Completed', 'High', 'Amogh', 'Empowers students to speak up without fear of retaliation.'),
('b0000000-0000-0000-0000-000000000002', 'Establish Student Idea Box', 'Student Voice', 'A digital suggestion box for campus improvements.', 'Completed', 'High', 'Team', 'Direct line from students to student council.'),
('b0000000-0000-0000-0000-000000000003', 'Revamp Canteen Menu', 'System & Tech', 'Work with administration to include healthier and more diverse options.', 'In Progress', 'Medium', 'Amogh', null),
('b0000000-0000-0000-0000-000000000004', 'Mental Health Awareness Week', 'Communication', 'A week dedicated to breaking the stigma around mental health.', 'Planned', 'Medium', 'Team', null);

-- Seed Subtasks
INSERT INTO public.subtasks (task_id, title, is_completed) VALUES
('b0000000-0000-0000-0000-000000000001', 'Design UI', true),
('b0000000-0000-0000-0000-000000000001', 'Build Backend APIs', true),
('b0000000-0000-0000-0000-000000000001', 'Test Security', true),

('b0000000-0000-0000-0000-000000000003', 'Survey Students for Preferences', true),
('b0000000-0000-0000-0000-000000000003', 'Meet with Caterers', false),
('b0000000-0000-0000-0000-000000000003', 'Finalize New Menu', false),

('b0000000-0000-0000-0000-000000000004', 'Book Speakers', false),
('b0000000-0000-0000-0000-000000000004', 'Design Posters', false);
