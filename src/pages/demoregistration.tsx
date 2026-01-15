import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoSessionService } from '../services/demosession';
import { Sparkles, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';

const DemoRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<{
    shareUrl: string;
    daysRemaining: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingSession(null);

    if (!email || !email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setLoading(true);

    try {
      const ipAddress = await demoSessionService.getClientIP();
      const browserFingerprint = demoSessionService.generateBrowserFingerprint();

      const existingCheck = await demoSessionService.checkExistingSession(email, ipAddress);

      if (existingCheck.hasExistingSession && existingCheck.session) {
        setExistingSession({
          shareUrl: existingCheck.shareUrl!,
          daysRemaining: existingCheck.daysRemaining!,
        });
        setLoading(false);
        return;
      }

      const result = await demoSessionService.createDemoSession(
        email,
        ipAddress,
        browserFingerprint
      );

      // Enable demo mode
      localStorage.setItem('demo_mode', 'true');
      localStorage.setItem('demo_share_token', result.session.share_token);
      localStorage.setItem('demo_session_id', result.session.id);
      localStorage.setItem('demo_org_id', result.session.demo_org_id);
      localStorage.setItem('demo_expires_at', result.session.expires_at);

      // Reload to trigger AuthContext demo mode initialization
      setTimeout(() => {
        window.location.href = '/dashboard/daily';
      }, 1500);

    } catch (err) {
      console.error('Failed to create demo session:', err);
      setError('デモセッションの作成に失敗しました。もう一度お試しください。');
      setLoading(false);
    }
  };

  const handleUseExisting = () => {
    if (existingSession) {
      const token = existingSession.shareUrl.split('/demo/')[1];
      navigate(`/demo/${token}`, { replace: true });
    }
  };

  const handleCreateNew = async () => {
    setExistingSession(null);
    setError(null);
  };

  if (existingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              既存のデモセッションがあります
            </h2>
            <p className="text-slate-600 mb-4">
              このメールアドレスまたはIPアドレスで作成された有効なデモセッションが見つかりました。
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-blue-900 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">残り {existingSession.daysRemaining} 日</span>
              </div>
              <p className="text-sm text-blue-800">
                既存のセッションを引き続きご利用いただけます
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleUseExisting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                既存のセッションを使用
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                トップページに戻る
              </Button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              新しいセッションは、現在のセッションの期限が切れた後に作成できます
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            デモ体験を開始
          </h1>
          <p className="text-slate-600">
            7日間、全機能を無料でお試しいただけます
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>作成中...</span>
              </div>
            ) : (
              'デモを開始'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>2店舗のサンプルデータ</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>全機能をフル体験</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>クレジットカード不要</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>7日間有効</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            トップページに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoRegistration;
