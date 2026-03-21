-- Update max_guests for specific units (Small/Big Bungalow: 3, Lykoskufi 1: 3, Lykoskufi 2: 5)
-- Run this in Supabase SQL Editor to sync database with room page limits

UPDATE units SET max_guests = 3
WHERE LOWER(name) LIKE '%small%bungalow%' OR LOWER(name) LIKE '%small bungalow%';

UPDATE units SET max_guests = 3
WHERE (LOWER(name) LIKE '%big%bungalow%' OR LOWER(name) LIKE '%big bungalow%' OR LOWER(name) LIKE '%μεγάλο%' OR LOWER(name) LIKE '%megalo%')
  AND LOWER(name) LIKE '%bungalow%';

UPDATE units SET max_guests = 3
WHERE LOWER(name) LIKE '%lykoskufi%1%' OR LOWER(name) LIKE '%lykoskufi 1%' OR LOWER(name) LIKE '%lykoski%1%';

UPDATE units SET max_guests = 5
WHERE LOWER(name) LIKE '%lykoskufi%2%' OR LOWER(name) LIKE '%lykoskufi 2%' OR LOWER(name) LIKE '%lykoski%2%';
