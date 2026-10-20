-- Plaiyo — seed the sports taxonomy (Coraline's list, from her app, 2026-10-20)
-- 11 categories, 77 unique sports. photo_url starts null on purpose:
-- licences must be verified before any production photo is attached.
-- Idempotent: re-running this migration does not duplicate rows.

insert into public.sports (name, category) values
  -- Team Ball Sports (18)
  ('Soccer / Football', 'Team Ball Sports'),
  ('Futsal', 'Team Ball Sports'),
  ('Beach Soccer', 'Team Ball Sports'),
  ('Basketball', 'Team Ball Sports'),
  ('Volleyball', 'Team Ball Sports'),
  ('Beach Volleyball', 'Team Ball Sports'),
  ('Handball', 'Team Ball Sports'),
  ('Dodgeball', 'Team Ball Sports'),
  ('American Football', 'Team Ball Sports'),
  ('Flag Football', 'Team Ball Sports'),
  ('Rugby', 'Team Ball Sports'),
  ('Field Hockey', 'Team Ball Sports'),
  ('Lacrosse', 'Team Ball Sports'),
  ('Netball', 'Team Ball Sports'),
  ('Korfball', 'Team Ball Sports'),
  ('Ultimate Frisbee', 'Team Ball Sports'),
  ('Quadball', 'Team Ball Sports'),
  ('Water Polo', 'Team Ball Sports'),
  -- Racket & Paddle Sports (6)
  ('Tennis', 'Racket & Paddle Sports'),
  ('Padel', 'Racket & Paddle Sports'),
  ('Pickleball', 'Racket & Paddle Sports'),
  ('Squash', 'Racket & Paddle Sports'),
  ('Badminton', 'Racket & Paddle Sports'),
  ('Table Tennis', 'Racket & Paddle Sports'),
  -- Running & Endurance (3 stored here; Cross Country Skiing is stored once
  -- under Winter Sports — see the note in the init migration)
  ('Running', 'Running & Endurance'),
  ('Trail Running', 'Running & Endurance'),
  ('Track & Field', 'Running & Endurance'),
  -- Cycling (5)
  ('Road Cycling', 'Cycling'),
  ('Gravel Cycling', 'Cycling'),
  ('Mountain Biking', 'Cycling'),
  ('BMX', 'Cycling'),
  ('Indoor Cycling / Spin', 'Cycling'),
  -- Water Sports (9)
  ('Swimming', 'Water Sports'),
  ('Rowing', 'Water Sports'),
  ('Dragon Boat Racing', 'Water Sports'),
  ('Kayaking', 'Water Sports'),
  ('Canoeing', 'Water Sports'),
  ('Stand Up Paddle', 'Water Sports'),
  ('Surfing', 'Water Sports'),
  ('Sailing', 'Water Sports'),
  ('Surf Boat Rowing', 'Water Sports'),
  -- Winter Sports (6)
  ('Ice Hockey', 'Winter Sports'),
  ('Curling', 'Winter Sports'),
  ('Ice Skating', 'Winter Sports'),
  ('Snowboarding', 'Winter Sports'),
  ('Alpine Skiing', 'Winter Sports'),
  ('Cross Country Skiing', 'Winter Sports'),
  -- Combat Sports / Martial Arts (9)
  ('Boxing', 'Combat Sports / Martial Arts'),
  ('Kickboxing', 'Combat Sports / Martial Arts'),
  ('Muay Thai', 'Combat Sports / Martial Arts'),
  ('MMA', 'Combat Sports / Martial Arts'),
  ('Judo', 'Combat Sports / Martial Arts'),
  ('Karate', 'Combat Sports / Martial Arts'),
  ('Taekwondo', 'Combat Sports / Martial Arts'),
  ('Wrestling', 'Combat Sports / Martial Arts'),
  ('Fencing', 'Combat Sports / Martial Arts'),
  -- Fitness & Training (9)
  ('CrossFit', 'Fitness & Training'),
  ('Functional Training', 'Fitness & Training'),
  ('HIIT', 'Fitness & Training'),
  ('Weightlifting', 'Fitness & Training'),
  ('Powerlifting', 'Fitness & Training'),
  ('Yoga', 'Fitness & Training'),
  ('Pilates', 'Fitness & Training'),
  ('Stretching / Mobility', 'Fitness & Training'),
  ('Zumba / Dance Fitness', 'Fitness & Training'),
  -- Outdoor Adventure (5)
  ('Hiking', 'Outdoor Adventure'),
  ('Trekking', 'Outdoor Adventure'),
  ('Climbing', 'Outdoor Adventure'),
  ('Bouldering', 'Outdoor Adventure'),
  ('Orienteering', 'Outdoor Adventure'),
  -- Board & Wheel Sports (3)
  ('Skateboarding', 'Board & Wheel Sports'),
  ('Rollerblading', 'Board & Wheel Sports'),
  ('Roller Derby', 'Board & Wheel Sports'),
  -- Precision / Club Sports (4)
  ('Golf', 'Precision / Club Sports'),
  ('Polo', 'Precision / Club Sports'),
  ('Archery', 'Precision / Club Sports'),
  ('Disc Golf', 'Precision / Club Sports')
on conflict (name) do nothing;
