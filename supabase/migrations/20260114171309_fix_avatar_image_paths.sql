/*
  # アバター画像パスの修正

  ## 問題
  - image_pathに `.png` が含まれている
  - コードで `/images/avatar/${item.image_path}.png` のように `.png` を追加している
  - 結果: `outfit_apron_red.png.png` のようになってしまう

  ## 修正内容
  - avatar_items テーブルの image_path から `.png` 拡張子を削除
*/

-- image_path から .png 拡張子を削除
UPDATE avatar_items
SET image_path = REPLACE(image_path, '.png', '')
WHERE image_path LIKE '%.png';
