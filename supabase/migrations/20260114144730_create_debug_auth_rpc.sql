/*
  # 簡易認証診断RPC
  
  1. 目的
    - 現在の認証状態を即座に確認
    - PostgRESTに認証が正しく届いているか診断
  
  2. 返り値
    - role: authenticated / anon
    - uid: ユーザーID（nullならanon扱い）
  
  3. 使用方法
    ```sql
    SELECT debug_auth();
    ```
*/

CREATE OR REPLACE FUNCTION public.debug_auth()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'role', auth.role(),
  'uid', auth.uid()
);
$$;