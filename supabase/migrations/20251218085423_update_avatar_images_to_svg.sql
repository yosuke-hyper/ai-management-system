/*
  # アバター画像をSVGに更新

  1. 変更内容
    - avatar_items テーブルの image_path を .png から .svg に更新
    - すべてのアバターアイテムがSVG形式の画像を使用するように変更

  2. 理由
    - SVG形式はスケーラブルで軽量
    - どのサイズでも高品質な表示が可能
    - ファイルサイズが小さく、パフォーマンスが向上
*/

-- アバターアイテムの画像パスを .png から .svg に更新
UPDATE avatar_items
SET image_path = REPLACE(image_path, '.png', '.svg')
WHERE image_path LIKE '%.png';
