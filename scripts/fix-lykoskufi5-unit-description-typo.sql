-- Fix typo in Lykoskufi 5 unit description: "δε δεσποζουσα" → "σε δεσποζουσα"
-- Run against your production/staging DB if the Unit row still has the old text.
UPDATE "Unit"
SET description = REPLACE(description, 'Ειναι κτισμενο δε δεσποζουσα θεση', 'Ειναι κτισμενο σε δεσποζουσα θεση')
WHERE LOWER(name) IN ('lykoskufi 5', 'lykoskufi5')
  AND description LIKE '%κτισμενο δε δεσποζουσα%';
