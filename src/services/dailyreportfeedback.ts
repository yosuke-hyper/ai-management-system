/**
 * 日報ポジティブフィードバックサービス
 *
 * 日報データをAIに送信し、柴犬「しばちゃん」からのポジティブなフィードバックを取得します。
 */

interface DailyReportData {
  date: string;
  sales: number;
  customer_count: number;
  note?: string;
  weather?: string;
}

export interface DailyReportFeedback {
  message: string;
  emotion: 'happy' | 'surprised' | 'love' | 'sparkle';
}

/**
 * 日報データを分析してポジティブなフィードバックを取得
 *
 * @param data 日報データ
 * @param authToken 認証トークン（オプション）
 * @param storeId 店舗ID（オプション）
 * @returns ポジティブなフィードバックメッセージと感情タイプ
 * @throws エラーが発生した場合
 */
export async function getDailyReportFeedback(
  data: DailyReportData,
  authToken?: string,
  storeId?: string
): Promise<DailyReportFeedback> {
  try {
    // Step 1: AI使用回数チェック（認証済みユーザーのみ）
    if (authToken && authToken !== import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const usageCheckUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-usage-proxy`;

      const usageResponse = await fetch(usageCheckUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store_id: storeId })
      });

      if (!usageResponse.ok) {
        const usageError = await usageResponse.json().catch(() => ({}));

        if (usageResponse.status === 429) {
          throw new Error(usageError.error || 'AI使用回数の上限に達しました');
        }

        console.warn('AI使用回数チェックエラー:', usageError);
      }
    }

    // Step 2: AI分析を実行
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-daily-report`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'フィードバックの取得に失敗しました');
    }

    const feedback: DailyReportFeedback = await response.json();

    // バリデーション
    if (!feedback.message || !feedback.emotion) {
      throw new Error('不正なレスポンス形式です');
    }

    return feedback;
  } catch (error) {
    console.error('日報フィードバック取得エラー:', error);

    // エラー時もポジティブなメッセージを返す（フォールバック）
    return {
      message: '今日もお疲れさまだワン！明日も一緒に頑張るワン！',
      emotion: 'happy'
    };
  }
}

/**
 * 感情タイプに対応する絵文字を取得
 *
 * @param emotion 感情タイプ
 * @returns 絵文字
 */
export function getEmotionEmoji(emotion: DailyReportFeedback['emotion']): string {
  const emojiMap: Record<DailyReportFeedback['emotion'], string> = {
    happy: '😊',
    surprised: '😲',
    love: '❤️',
    sparkle: '✨'
  };

  return emojiMap[emotion] || '🐶';
}

/**
 * 感情タイプに対応する色を取得
 *
 * @param emotion 感情タイプ
 * @returns Tailwind CSS クラス名
 */
export function getEmotionColor(emotion: DailyReportFeedback['emotion']): string {
  const colorMap: Record<DailyReportFeedback['emotion'], string> = {
    happy: 'bg-yellow-50 border-yellow-300',
    surprised: 'bg-purple-50 border-purple-300',
    love: 'bg-pink-50 border-pink-300',
    sparkle: 'bg-blue-50 border-blue-300'
  };

  return colorMap[emotion] || 'bg-gray-50 border-gray-300';
}

/**
 * 感情タイプに対応するアニメーション効果を取得
 *
 * @param emotion 感情タイプ
 * @returns アニメーションクラス名
 */
export function getEmotionAnimation(emotion: DailyReportFeedback['emotion']): string {
  const animationMap: Record<DailyReportFeedback['emotion'], string> = {
    happy: 'animate-bounce',
    surprised: 'animate-pulse',
    love: 'animate-ping',
    sparkle: 'animate-spin'
  };

  return animationMap[emotion] || '';
}

/**
 * フィードバックメッセージを音声で読み上げる（オプション機能）
 *
 * @param message メッセージ
 */
export function speakFeedback(message: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.2; // 少し高めの声で元気よく
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * フィードバックをローカルストレージに保存
 *
 * @param date 日付
 * @param feedback フィードバック
 */
export function saveFeedbackToHistory(
  date: string,
  feedback: DailyReportFeedback
): void {
  try {
    const key = `feedback_history_${date}`;
    localStorage.setItem(key, JSON.stringify(feedback));
  } catch (error) {
    console.error('フィードバック履歴の保存に失敗:', error);
  }
}

/**
 * 過去のフィードバックを取得
 *
 * @param date 日付
 * @returns フィードバック（存在しない場合はnull）
 */
export function getFeedbackFromHistory(
  date: string
): DailyReportFeedback | null {
  try {
    const key = `feedback_history_${date}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('フィードバック履歴の取得に失敗:', error);
  }
  return null;
}

/**
 * フィードバック履歴をクリア
 */
export function clearFeedbackHistory(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('feedback_history_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('フィードバック履歴のクリアに失敗:', error);
  }
}
