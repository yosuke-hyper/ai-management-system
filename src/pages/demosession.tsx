import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { demoSessionService } from '../services/demosession';
import { Sparkles, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';

const DemoSession: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const loadDemoSession = async () => {
      if (!shareToken) {
        setError('無効なデモリンクです。');
        setLoading(false);
        return;
      }

      try {
        const expiry = await demoSessionService.checkSessionExpiry(shareToken);

        if (expiry.isExpired) {
          setError('このデモリンクは有効期限が切れています。');
          setLoading(false);
          return;
        }

        if (!expiry.isValid) {
          setError('このデモリンクは無効です。');
          setLoading(false);
          return;
        }

        const session = await demoSessionService.getDemoSessionByShareToken(shareToken);

        if (!session) {
          setError('デモセッションが見つかりません。');
          setLoading(false);
          return;
        }

        setDaysRemaining(expiry.daysRemaining);

        // Enable demo mode
        localStorage.setItem('demo_mode', 'true');
        localStorage.setItem('demo_share_token', shareToken);
        localStorage.setItem('demo_session_id', session.id);
        localStorage.setItem('demo_org_id', session.demo_org_id);
        localStorage.setItem('demo_expires_at', session.expires_at);

        // Reload to trigger AuthContext demo mode initialization
        window.location.href = '/dashboard/daily';

      } catch (err) {
        console.error('Failed to load demo session:', err);
        setError('デモセッションの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadDemoSession();
  }, [shareToken, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <Sparkles className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg text-slate-700 font-medium">デモ環境を準備中...</p>
          <p className="mt-2 text-sm text-slate-500">まもなく体験を開始できます</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {error.includes('期限') ? 'デモ期間が終了しました' : 'アクセスエラー'}
            </h2>
            <p className="text-slate-600 mb-6">{error}</p>

            {error.includes('期限') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  本登録で制限なく利用できます
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>期限なしで全機能を利用</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>データの入力・編集が可能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>チームメンバーの招待</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>14日間の無料トライアル</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/signup')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3"
              >
                無料で本登録を始める
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full border-slate-300"
              >
                ログイン画面に戻る
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="relative mb-6">
          <div className="animate-pulse">
            <Sparkles className="w-20 h-20 text-blue-600 mx-auto" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">デモ環境へようこそ</h2>
        <p className="text-slate-600 mb-4">
          7日間の体験期間で全機能をお試しいただけます
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>残り {daysRemaining} 日間有効</span>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          まもなくダッシュボードに移動します...
        </p>
      </div>
    </div>
  );
};

export default DemoSession;
