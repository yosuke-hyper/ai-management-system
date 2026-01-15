import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { avatarToast } from '@/lib/avatartoast';
import { useAvatar } from '@/contexts/avatarcontext';

export const AvatarToastDemo: React.FC = () => {
  const { triggerInputReaction } = useAvatar();
  const handleSuccess = () => {
    avatarToast.success('保存しました');
  };

  const handleError = () => {
    avatarToast.error('エラーが発生しました');
  };

  const handleLoading = () => {
    const toastId = avatarToast.loading('処理しています');
    setTimeout(() => {
      avatarToast.dismiss(toastId);
      avatarToast.success('処理完了しました');
    }, 2000);
  };

  const handleInfo = () => {
    avatarToast.info('コピーしました');
  };

  const handlePromise = async () => {
    const mockPromise = new Promise((resolve) => {
      setTimeout(() => resolve(true), 2000);
    });

    await avatarToast.promise(mockPromise, {
      loading: '保存しています',
      success: '保存しました',
      error: '保存に失敗しました'
    });
  };

  const handleDelete = () => {
    avatarToast.success('削除しました');
  };

  const handleUpdate = () => {
    avatarToast.success('更新しました');
  };

  const handleCreate = () => {
    avatarToast.success('作成しました');
  };

  const handleSend = () => {
    avatarToast.success('送信しました');
  };

  const handleLogin = () => {
    avatarToast.success('ログインしました');
  };

  const handleAchievement = () => {
    avatarToast.success('目標達成しました');
  };

  const handleUpload = () => {
    avatarToast.success('アップロードしました');
  };

  const handleDownload = () => {
    avatarToast.success('ダウンロードしました');
  };

  const handleSync = () => {
    avatarToast.success('同期しました');
  };

  const handleVerify = () => {
    avatarToast.success('検証完了しました');
  };

  const handleInputReaction = (type: 'form-submit' | 'success' | 'error' | 'button-click' | 'data-change') => {
    triggerInputReaction(type);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>アバタートーストシステム - デモ</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            各ボタンをクリックして、アバターの反応とトースト通知を確認してください。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">基本タイプ</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button onClick={handleSuccess} variant="outline" className="bg-green-50 hover:bg-green-100">
                成功通知
              </Button>
              <Button onClick={handleError} variant="outline" className="bg-red-50 hover:bg-red-100">
                エラー通知
              </Button>
              <Button onClick={handleLoading} variant="outline" className="bg-blue-50 hover:bg-blue-100">
                ローディング
              </Button>
              <Button onClick={handleInfo} variant="outline" className="bg-gray-50 hover:bg-gray-100">
                情報通知
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">操作系</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button onClick={handleCreate} variant="outline">
                作成
              </Button>
              <Button onClick={handleUpdate} variant="outline">
                更新
              </Button>
              <Button onClick={handleDelete} variant="outline">
                削除
              </Button>
              <Button onClick={handleSend} variant="outline">
                送信
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">データ転送系</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button onClick={handleUpload} variant="outline">
                アップロード
              </Button>
              <Button onClick={handleDownload} variant="outline">
                ダウンロード
              </Button>
              <Button onClick={handleSync} variant="outline">
                同期
              </Button>
              <Button onClick={handleVerify} variant="outline">
                検証
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">特殊系</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button onClick={handleLogin} variant="outline">
                ログイン
              </Button>
              <Button onClick={handleAchievement} variant="outline" className="bg-yellow-50 hover:bg-yellow-100">
                目標達成
              </Button>
              <Button onClick={handlePromise} variant="outline" className="bg-lime-50 hover:bg-lime-100">
                Promise処理
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">🆕 入力反応システム</h3>
            <p className="text-sm text-muted-foreground mb-2">
              ユーザーの操作に応じてアバターが自動的に反応します
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleInputReaction('form-submit')}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100"
              >
                フォーム送信
              </Button>
              <Button
                onClick={() => handleInputReaction('success')}
                variant="outline"
                className="bg-green-50 hover:bg-green-100"
              >
                成功
              </Button>
              <Button
                onClick={() => handleInputReaction('error')}
                variant="outline"
                className="bg-red-50 hover:bg-red-100"
              >
                エラー
              </Button>
              <Button
                onClick={() => handleInputReaction('button-click')}
                variant="outline"
              >
                ボタンクリック
              </Button>
              <Button
                onClick={() => handleInputReaction('data-change')}
                variant="outline"
                className="bg-orange-50 hover:bg-orange-100"
              >
                データ変更
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-blue-900 mb-2">使い方</h4>
            <p className="text-sm text-blue-800">
              画面右下のアバターに注目してください。各ボタンをクリックすると：
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li>アバターの表情が変化します（成功=笑顔、エラー=困り顔、ローディング=真剣な顔）</li>
              <li>アバターの頭上に吹き出しが表示されます</li>
              <li>メッセージがアバター口調に自動変換されます</li>
              <li>アバターが「プルン」と弾むアニメーションをします</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-green-900 mb-2">💡 アバターをクリックしてみよう！</h4>
            <p className="text-sm text-green-800">
              画面右下のアバターを直接クリックすると、ランダムなセリフを話してくれます！
            </p>
            <ul className="text-sm text-green-800 mt-2 space-y-1 ml-4 list-disc">
              <li>25種類以上のセリフがランダムで表示されます</li>
              <li>「ポヨッ」という可愛い効果音が鳴ります</li>
              <li>セリフに合わせて表情が変化します</li>
              <li>3秒間吹き出しが表示された後、元の状態に戻ります</li>
            </ul>
            <p className="text-sm text-green-800 mt-2 font-medium">
              👉 試しにアバターをクリックしてみてください！
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-amber-900 mb-2">🆕 ヘルプチャット機能！</h4>
            <p className="text-sm text-amber-800 mb-2">
              使い方が分からない時は、アバターに質問できます！
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded p-2 border border-amber-200">
                <p className="text-sm font-medium text-amber-900">開き方（3つの方法）：</p>
                <ul className="text-sm text-amber-800 mt-1 space-y-1 ml-4 list-disc">
                  <li>アバターを<strong>ダブルクリック</strong></li>
                  <li>アバターを<strong>長押し</strong>（0.8秒以上）</li>
                  <li>アバター左上の<strong>ヘルプボタン</strong>をクリック</li>
                </ul>
              </div>
              <div className="bg-white rounded p-2 border border-amber-200">
                <p className="text-sm font-medium text-amber-900">できること：</p>
                <ul className="text-sm text-amber-800 mt-1 space-y-1 ml-4 list-disc">
                  <li>15種類以上のよくある質問に自動回答</li>
                  <li>キーワードマッチングで適切な回答を検索</li>
                  <li>クイックアクションで頻繁な質問に即アクセス</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-amber-800 mt-2 font-medium">
              💬 「日報の入力方法は？」「目標設定のやり方は？」など聞いてみてください！
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvatarToastDemo;
