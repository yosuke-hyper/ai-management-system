/*
  # Remove outdated vendors category check constraint
  
  1. Problem
    - The vendors table has a CHECK constraint that only allows fixed category values
    - New vendor_categories table uses UUID-based category IDs per organization
    - This constraint prevents using custom category IDs
  
  2. Changes
    - Drop the vendors_category_check constraint to allow any category value
    - Category validation is now handled by the vendor_categories table
  
  3. Notes
    - This allows organizations to use their own custom category IDs
    - The category field remains as text to store category IDs
*/

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_category_check;
