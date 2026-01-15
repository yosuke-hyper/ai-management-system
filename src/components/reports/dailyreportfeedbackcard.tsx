import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getDailyReportFeedback,
  getEmotionEmoji,
  getEmotionColor,
  saveFeedbackToHistory,
  getFeedbackFromHistory,
  type DailyReportFeedback
} from '@/services/dailyreportfeedback';

interface DailyReportFeedbackCardProps {
  date: string;
  sales: number;
  customerCount: number;
  note?: string;
  weather?: string;
  autoFetch?: boolean; // 自動でフィードバックを取得するか
  onFeedbackReceived?: (feedback: DailyReportFeedback) => void;
}

/**
 * 日報ポジティブフィードバック表示カード
 *
 * 日報データを送信し、柴犬「しばちゃん」からのポジティブなフィードバックを表示します。
 */
export function DailyReportFeedbackCard({
  date,
  sales,
  customerCount,
  note,
  weather,
  autoFetch = false,
  onFeedbackReceived
}: DailyReportFeedbackCardProps) {
  const [feedback, setFeedback] = useState<DailyReportFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // コンポーネントマウント時に履歴をチェック
  useState(() => {
    const cachedFeedback = getFeedbackFromHistory(date);
    if (cachedFeedback) {
      setFeedback(cachedFeedback);
    } else if (autoFetch) {
      fetchFeedback();
    }
  });

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDailyReportFeedback({
        date,
        sales,
        customer_count: customerCount,
        note,
        weather
      });

      setFeedback(result);
      saveFeedbackToHistory(date, result);

      if (onFeedbackReceived) {
        onFeedbackReceived(result);
      }
    } catch (err) {
      console.error('フィードバック取得エラー:', err);
      setError('フィードバックの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-yellow-50 border-2 border-yellow-200">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
          <p className="text-gray-700 font-medium">
            しばちゃんが考え中...
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-2 border-red-200">
        <div className="flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <Button
            onClick={fetchFeedback}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300"
          >
            再試行
          </Button>
        </div>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🐶</div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                しばちゃんからのコメント
              </p>
              <p className="text-gray-700">
                今日の頑張りをしばちゃんに聞いてみませんか？
              </p>
            </div>
          </div>
          <Button
            onClick={fetchFeedback}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            コメントを見る
          </Button>
        </div>
      </Card>
    );
  }

  const emotionColor = getEmotionColor(feedback.emotion);
  const emotionEmoji = getEmotionEmoji(feedback.emotion);

  return (
    <Card className={`p-6 border-2 ${emotionColor} animate-fadeIn`}>
      <div className="flex items-start gap-4">
        {/* しばちゃんアバター */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg border-2 border-yellow-400">
            {emotionEmoji}
          </div>
        </div>

        {/* メッセージコンテンツ */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">
              しばちゃんより
            </span>
            <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-gray-600">
              {feedback.emotion === 'happy' && '応援'}
              {feedback.emotion === 'surprised' && 'すごい！'}
              {feedback.emotion === 'love' && '感謝'}
              {feedback.emotion === 'sparkle' && '特別'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-lg font-medium text-gray-900 leading-relaxed">
              {feedback.message}
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              onClick={fetchFeedback}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              もう一度聞く
            </Button>
          </div>
        </div>
      </div>

      {/* デコレーション */}
      <div className="absolute top-2 right-2 opacity-20">
        <Sparkles className="w-8 h-8 text-yellow-500" />
      </div>
    </Card>
  );
}
