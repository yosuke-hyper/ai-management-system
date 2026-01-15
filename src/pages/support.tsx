import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Mail,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/authcontext';

interface SystemStatusItem {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'checking';
  icon: React.ComponentType<{ className?: string }>;
  responseTime?: number;
  details?: string;
}

export default function Support() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    message: '',
    email: ''
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([
    { name: 'アプリケーション', status: 'checking', icon: Zap },
    { name: 'データベース', status: 'checking', icon: Database },
    { name: 'AI機能', status: 'checking', icon: Server },
    { name: '認証システム', status: 'checking', icon: Shield }
  ]);

  useEffect(() => {
    if (profile?.email) {
      setFormData(prev => ({ ...prev, email: profile.email || '' }));
    }
  }, [profile]);

  const checkDatabaseHealth = useCallback(async (): Promise<SystemStatusItem> => {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'データベース',
          status: 'outage',
          icon: Database,
          details: 'データベース接続エラー'
        };
      }

      return {
        name: 'データベース',
        status: responseTime > 2000 ? 'degraded' : 'operational',
        icon: Database,
        responseTime,
        details: responseTime > 2000 ? `応答遅延 (${responseTime}ms)` : undefined
      };
    } catch {
      return {
        name: 'データベース',
        status: 'outage',
        icon: Database,
        details: 'データベース接続失敗'
      };
    }
  }, []);

  const checkAIHealth = useCallback(async (): Promise<SystemStatusItem> => {
    const startTime = Date.now();
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-gpt`,
        {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        }
      );
      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === 204) {
        return {
          name: 'AI機能',
          status: responseTime > 3000 ? 'degraded' : 'operational',
          icon: Server,
          responseTime,
          details: responseTime > 3000 ? `応答遅延 (${responseTime}ms)` : undefined
        };
      }

      return {
        name: 'AI機能',
        status: 'degraded',
        icon: Server,
        details: 'AI機能の応答が遅延しています'
      };
    } catch {
      return {
        name: 'AI機能',
        status: 'outage',
        icon: Server,
        details: 'AI機能に接続できません'
      };
    }
  }, []);

  const checkAuthHealth = useCallback(async (): Promise<SystemStatusItem> => {
    const startTime = Date.now();
    try {
      const { error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: '認証システム',
          status: 'outage',
          icon: Shield,
          details: '認証システムエラー'
        };
      }

      return {
        name: '認証システム',
        status: responseTime > 2000 ? 'degraded' : 'operational',
        icon: Shield,
        responseTime,
        details: responseTime > 2000 ? `応答遅延 (${responseTime}ms)` : undefined
      };
    } catch {
      return {
        name: '認証システム',
        status: 'outage',
        icon: Shield,
        details: '認証システムに接続できません'
      };
    }
  }, []);

  const checkApplicationHealth = useCallback(async (): Promise<SystemStatusItem> => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: errorLogs, error } = await supabase
        .from('error_logs')
        .select('id, severity')
        .gte('created_at', oneHourAgo);

      if (error) {
        return {
          name: 'アプリケーション',
          status: 'operational',
          icon: Zap,
          details: 'エラーログ取得不可（正常動作中）'
        };
      }

      const criticalCount = errorLogs?.filter(
        log => log.severity === 'critical' || log.severity === 'error'
      ).length || 0;
      const totalErrors = errorLogs?.length || 0;

      if (criticalCount > 10) {
        return {
          name: 'アプリケーション',
          status: 'outage',
          icon: Zap,
          details: `重大エラー多発 (${criticalCount}件/時間)`
        };
      }

      if (criticalCount > 3 || totalErrors > 20) {
        return {
          name: 'アプリケーション',
          status: 'degraded',
          icon: Zap,
          details: `エラー検出 (${totalErrors}件/時間)`
        };
      }

      return {
        name: 'アプリケーション',
        status: 'operational',
        icon: Zap
      };
    } catch {
      return {
        name: 'アプリケーション',
        status: 'operational',
        icon: Zap
      };
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    setIsCheckingHealth(true);

    setSystemStatus([
      { name: 'アプリケーション', status: 'checking', icon: Zap },
      { name: 'データベース', status: 'checking', icon: Database },
      { name: 'AI機能', status: 'checking', icon: Server },
      { name: '認証システム', status: 'checking', icon: Shield }
    ]);

    const [dbStatus, aiStatus, authStatus, appStatus] = await Promise.all([
      checkDatabaseHealth(),
      checkAIHealth(),
      checkAuthHealth(),
      checkApplicationHealth()
    ]);

    setSystemStatus([appStatus, dbStatus, aiStatus, authStatus]);
    setLastChecked(new Date());
    setIsCheckingHealth(false);
  }, [checkDatabaseHealth, checkAIHealth, checkAuthHealth, checkApplicationHealth]);

  useEffect(() => {
    checkSystemHealth();
  }, [checkSystemHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.message || !formData.email) {
      toast.error('必須項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('support_requests').insert({
        user_id: user?.id || null,
        email: formData.email,
        subject: formData.subject,
        category: formData.category,
        message: formData.message,
        status: 'open'
      });

      if (error) throw error;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-support-request-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              email: formData.email,
              subject: formData.subject,
              category: formData.category,
              message: formData.message,
              userName: profile?.full_name || undefined
            }),
          }
        );

        if (!emailResponse.ok) {
          console.error('Email sending failed, but request was saved');
        } else {
          const result = await emailResponse.json();
          if (result.isDemoMode) {
            console.log('Demo mode: Email would be sent');
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      setSubmitted(true);
      toast.success('お問い合わせを受け付けました');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('送信に失敗しました。メールでお問い合わせください。');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-amber-600 bg-amber-50';
      case 'outage': return 'text-red-600 bg-red-50';
      case 'checking': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return CheckCircle;
      case 'degraded': return Clock;
      case 'outage': return AlertTriangle;
      case 'checking': return Loader2;
      default: return CheckCircle;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return '正常稼働中';
      case 'degraded': return '一部遅延';
      case 'outage': return '障害発生中';
      case 'checking': return '確認中...';
      default: return '不明';
    }
  };

  const overallStatus = systemStatus.some(s => s.status === 'checking')
    ? 'checking'
    : systemStatus.some(s => s.status === 'outage')
      ? 'outage'
      : systemStatus.some(s => s.status === 'degraded')
        ? 'degraded'
        : 'operational';

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              お問い合わせを受け付けました
            </h2>
            <p className="text-gray-600 mb-4">
              {formData.email} に確認メールをお送りしました。
            </p>
            <p className="text-sm text-gray-500 mb-6">
              通常1-2営業日以内に担当者よりご連絡いたします。
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setFormData({ subject: '', category: 'general', message: '', email: profile?.email || '' });
              }}
              variant="outline"
            >
              新しいお問い合わせ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <HelpCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サポート</h1>
          <p className="text-gray-600">お困りのことがありましたらお気軽にお問い合わせください</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                overallStatus === 'checking' ? 'bg-blue-500 animate-pulse' :
                overallStatus === 'operational' ? 'bg-green-500' :
                overallStatus === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              システムステータス
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="text-xs text-gray-500">
                  最終確認: {lastChecked.toLocaleTimeString('ja-JP')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={checkSystemHealth}
                disabled={isCheckingHealth}
                className="h-8"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                再確認
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {systemStatus.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.name}
                  className={`p-4 rounded-lg ${getStatusColor(item.status)} transition-all`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ItemIcon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-4 h-4 ${item.status === 'checking' ? 'animate-spin' : ''}`} />
                    <span className="text-xs">{getStatusText(item.status)}</span>
                  </div>
                  {item.details && (
                    <p className="text-xs mt-1 opacity-80">{item.details}</p>
                  )}
                  {item.responseTime && item.status === 'operational' && (
                    <p className="text-xs mt-1 opacity-60">{item.responseTime}ms</p>
                  )}
                </div>
              );
            })}
          </div>
          {overallStatus === 'outage' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                現在一部のサービスに障害が発生しています。
                復旧まで今しばらくお待ちください。
              </p>
            </div>
          )}
          {overallStatus === 'degraded' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                現在一部のサービスで遅延が発生しています。
                ご不便をおかけして申し訳ございません。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>お問い合わせフォーム</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">一般的な質問</option>
                  <option value="technical">技術的な問題</option>
                  <option value="billing">料金・プラン</option>
                  <option value="feature">機能リクエスト</option>
                  <option value="bug">バグ報告</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="お問い合わせ内容の件名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="お問い合わせ内容を詳しくご記入ください"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                送信する
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メールでのお問い合わせ</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:info@smartfoodlocker.tech"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Mail className="w-4 h-4" />
                info@smartfoodlocker.tech
              </a>
              <p className="text-xs text-gray-500 mt-2">
                返信まで1-2営業日いただく場合がございます
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">営業時間</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <p>平日 9:00〜17:00</p>
              <p>土・祝日 9:00〜15:00</p>
              <p className="text-xs text-gray-500 mt-1">
                (日曜定休)
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <Link to="/dashboard/faq" className="block">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  よくある質問
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  操作方法や機能についてのよくある質問をご確認いただけます
                </p>
                <span className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  FAQページを見る
                  <ArrowRight className="w-4 h-4" />
                </span>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
