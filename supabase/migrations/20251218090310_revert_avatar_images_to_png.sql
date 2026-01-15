/*
  # アバター画像を PNG に戻す

  1. 変更内容
    - avatar_items テーブルの image_path を .svg から .png に戻す
    - 実際のファイルは .png 形式で存在するため、データベースを修正

  2. 理由
    - SVGファイルが実際には存在しない
    - 既存のPNGファイルを使用するため、パスを元に戻す必要がある
*/

-- アバターアイテムの画像パスを .svg から .png に戻す
UPDATE avatar_items
SET image_path = REPLACE(image_path, '.svg', '.png')
WHERE image_path LIKE '%.svg';
