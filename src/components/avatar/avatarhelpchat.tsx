import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Circle as HelpCircle, Book, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findMatchingFAQ, getQuickActions, defaultGreeting, noMatchResponse } from '@/lib/helpfaq';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AvatarHelpChatProps {
  onClose: () => void;
  position?: 'left' | 'right';
}

export function AvatarHelpChat({ onClose, position = 'right' }: AvatarHelpChatProps) {
  console.log('[AvatarHelpChat] position prop:', position);
  const isRightPosition = position === 'right' || position === undefined;
  console.log('[AvatarHelpChat] isRightPosition:', isRightPosition);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: defaultGreeting,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isReadyToSend, setIsReadyToSend] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickActions = getQuickActions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const matchedFAQ = findMatchingFAQ(messageText);
      const responseText = matchedFAQ ? matchedFAQ.answer : noMatchResponse;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleQuickAction = (question: string) => {
    handleSendMessage(question);
    setIsReadyToSend(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsReadyToSend(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
      e.preventDefault();
      if (!inputValue.trim()) return;

      if (isReadyToSend) {
        handleSendMessage();
        setIsReadyToSend(false);
      } else {
        setIsReadyToSend(true);
      }
    }
  };

  return (
    <div className={`fixed bottom-32 ${isRightPosition ? 'left-32' : 'right-6'} w-96 max-w-[calc(100vw-3rem)] z-[60]`}>
      <div className="relative bg-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* 吹き出しの三角形（アバター側を向く） */}
        {isRightPosition && (
          <div className="absolute left-0 bottom-8 transform -translate-x-1/2 rotate-45 w-6 h-6 bg-white border-l-2 border-b-2 border-blue-500"></div>
        )}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold">ワンちゃん</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="text-white border-2 border-white hover:bg-white hover:text-blue-600 px-4 py-2 rounded-full transition-all text-sm font-medium shadow-sm hover:shadow-md"
              aria-label="詳細な使い方ガイド"
            >
              詳細なガイド
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="チャットを閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-blue-50/30">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-blue-200 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-blue-200 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="border-t border-blue-200 p-3 bg-white">
            <p className="text-xs text-gray-600 mb-2 font-medium">よく使う機能</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.question)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-2 rounded border border-blue-200 transition-colors text-left"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-blue-200 p-3 bg-white">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="質問を入力してください..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
                    isReadyToSend
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  disabled={isTyping}
                />
                {isReadyToSend && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium">
                    Enter送信
                  </span>
                )}
              </div>
              <Button
                onClick={() => {
                  handleSendMessage();
                  setIsReadyToSend(false);
                }}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {isReadyToSend ? 'Enterで送信 / 編集で確定解除' : 'Enterで確定'}
            </p>
          </div>
        </div>
      </div>

      {/* 詳細な使い方ガイドモーダル */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-6 h-6" />
                <h2 className="text-xl font-bold">詳細な使い方ガイド</h2>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-88px)] p-6 space-y-6">
              {/* はじめに */}
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5">
                <h3 className="text-xl font-bold text-blue-900 mb-3">FoodValue AI へようこそ</h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  FoodValue AIは、飲食店経営を強力にサポートするAI搭載の経営管理システムです。
                  日々の売上管理から詳細な分析、AI による経営アドバイスまで、店舗経営に必要なすべての機能を提供します。
                </p>
                <div className="bg-white rounded-lg p-3 mt-3">
                  <p className="text-xs font-semibold text-blue-800 mb-2">このガイドでは以下を学べます：</p>
                  <ul className="text-xs text-gray-700 space-y-1 ml-4 list-disc">
                    <li>システムの基本的な使い方</li>
                    <li>データ入力と管理の方法</li>
                    <li>ダッシュボードの見方と活用法</li>
                    <li>AI機能の効果的な使い方</li>
                    <li>よくあるトラブルの解決方法</li>
                  </ul>
                </div>
              </section>

              {/* 基本機能 */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-blue-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-blue-500" />
                  基本機能
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">質問機能</h4>
                    <p className="text-sm text-gray-700 mb-2">入力欄に質問を入力すると、キーワードマッチングで最適な回答を提供します。</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>質問例：</strong></p>
                      <ul className="ml-4 list-disc space-y-0.5">
                        <li>「日報の入力方法は？」</li>
                        <li>「店舗を追加するには？」</li>
                        <li>「レポートの見方を教えて」</li>
                        <li>「目標設定の方法は？」</li>
                        <li>「データをエクスポートしたい」</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">よく使う機能ボタン</h4>
                    <p className="text-sm text-gray-700 mb-2">チャット開始時に表示される4つのクイックアクションボタンをクリックすると、よくある質問の回答がすぐに表示されます。</p>
                    <p className="text-xs text-gray-600 mt-2">💡 <strong>ヒント：</strong>初めての方は、まずクイックアクションボタンを試してみましょう。</p>
                  </div>
                </div>
              </section>

              {/* データ入力 */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-green-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-green-500" />
                  データ入力
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">📊 日次レポート入力（毎日）</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li className="font-medium">サイドバーの「日報入力」をクリック</li>
                      <li>店舗と日付を選択
                        <ul className="ml-6 mt-1 text-xs text-gray-600 list-disc">
                          <li>複数店舗がある場合は切り替え可能</li>
                          <li>過去の日付も入力・修正できます</li>
                        </ul>
                      </li>
                      <li>以下の項目を入力：
                        <ul className="ml-6 mt-1 text-xs text-gray-600 list-disc">
                          <li><strong>売上高：</strong>当日の総売上</li>
                          <li><strong>客数：</strong>来店されたお客様の数</li>
                          <li><strong>客単価：</strong>自動計算されます</li>
                          <li><strong>食材費：</strong>当日使用した食材のコスト</li>
                          <li><strong>人件費：</strong>当日のスタッフ人件費</li>
                          <li><strong>その他経費：</strong>光熱費、消耗品など</li>
                        </ul>
                      </li>
                      <li>「保存」ボタンをクリック</li>
                    </ol>
                    <div className="mt-3 p-2 bg-white rounded border border-green-300">
                      <p className="text-xs text-green-800"><strong>💡 入力のコツ：</strong>レジ締め後すぐに入力すると、正確なデータが記録できます。</p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">💰 月次経費入力（月1回）</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li>「データ管理」→「月次経費」タブを開く</li>
                      <li>店舗と月を選択</li>
                      <li>固定費を入力：
                        <ul className="ml-6 mt-1 text-xs text-gray-600 list-disc">
                          <li><strong>家賃：</strong>店舗の賃料</li>
                          <li><strong>固定人件費：</strong>正社員給与など</li>
                          <li><strong>光熱費：</strong>電気・ガス・水道</li>
                          <li><strong>通信費：</strong>インターネット、電話代</li>
                          <li><strong>広告宣伝費：</strong>チラシ、SNS広告など</li>
                          <li><strong>その他固定費：</strong>保険料、リース代など</li>
                        </ul>
                      </li>
                      <li>「保存」ボタンをクリック</li>
                    </ol>
                    <div className="mt-3 p-2 bg-white rounded border border-green-300">
                      <p className="text-xs text-green-800"><strong>💡 推奨：</strong>月初に前月分を入力すると、月次分析が正確になります。</p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">📁 CSV一括インポート（まとめて入力）</h4>
                    <p className="text-sm text-gray-700 mb-2">POSレジのデータをCSVファイルで一括インポートできます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「データ管理」→「CSV一括インポート」タブ</li>
                      <li>サンプルCSVをダウンロード</li>
                      <li>サンプル形式に合わせてデータを準備</li>
                      <li>ファイルをアップロード</li>
                      <li>プレビューで確認後、インポート実行</li>
                    </ol>
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-300">
                      <p className="text-xs text-yellow-800"><strong>⚠️ 注意：</strong>CSVの形式が正しくないとエラーになります。必ずサンプルファイルを参考にしてください。</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 店舗管理 */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-orange-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-orange-500" />
                  店舗管理
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">🏪 店舗の追加</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li>「データ管理」→「店舗管理」タブを開く</li>
                      <li>「店舗を追加」ボタンをクリック</li>
                      <li>以下の情報を入力：
                        <ul className="ml-6 mt-1 text-xs text-gray-600 list-disc">
                          <li><strong>店舗名：</strong>表示される店舗の名前</li>
                          <li><strong>住所：</strong>店舗の所在地</li>
                          <li><strong>営業時間：</strong>開店・閉店時間</li>
                          <li><strong>電話番号：</strong>連絡先</li>
                          <li><strong>メールアドレス：</strong>通知受信用</li>
                        </ul>
                      </li>
                      <li>「保存」ボタンをクリック</li>
                    </ol>
                    <div className="mt-2 p-2 bg-white rounded border border-orange-300">
                      <p className="text-xs text-orange-800"><strong>💡 ヒント：</strong>契約プランによって登録可能な店舗数が異なります。</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">✏️ 店舗の編集・削除</h4>
                    <p className="text-sm text-gray-700 mb-2">店舗一覧から編集したい店舗の「編集」ボタンをクリックし、情報を更新後、保存します。</p>
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-300">
                      <p className="text-xs text-red-800"><strong>⚠️ 削除の注意：</strong>店舗を削除すると、その店舗のすべてのデータが削除されます。削除前に必ずバックアップを取ってください。</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">📅 店舗休日の設定</h4>
                    <p className="text-sm text-gray-700 mb-2">定休日や臨時休業日を設定できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「データ管理」→「店舗管理」→「休日設定」</li>
                      <li>カレンダーから休業日を選択</li>
                      <li>休業理由を入力（任意）</li>
                      <li>保存すると、その日は売上目標から除外されます</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* ダッシュボード */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-purple-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-purple-500" />
                  ダッシュボードの見方
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">📈 日次ダッシュボード</h4>
                    <p className="text-sm text-gray-700 mb-2">1日単位の売上と経費を詳細に分析します。</p>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>主要指標：</strong></p>
                      <ul className="ml-4 list-disc space-y-0.5">
                        <li><strong>売上高：</strong>当日の総売上（前日比を％で表示）</li>
                        <li><strong>客数・客単価：</strong>来店客数と1人あたりの平均支出</li>
                        <li><strong>粗利益・粗利率：</strong>売上から食材費を引いた利益</li>
                        <li><strong>目標達成率：</strong>設定した目標に対する達成度</li>
                        <li><strong>経費内訳：</strong>食材費、人件費、その他経費の詳細</li>
                      </ul>
                    </div>
                    <div className="mt-2 p-2 bg-white rounded border border-purple-300">
                      <p className="text-xs text-purple-800"><strong>💡 活用法：</strong>毎日チェックして、異常な数値がないか確認しましょう。</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">📊 週次ダッシュボード</h4>
                    <p className="text-sm text-gray-700 mb-2">1週間の傾向を把握し、曜日ごとの特徴を分析します。</p>
                    <div className="text-xs text-gray-700 space-y-1">
                      <ul className="ml-4 list-disc space-y-0.5">
                        <li>週間売上推移グラフ</li>
                        <li>曜日別の売上比較</li>
                        <li>週間目標達成状況</li>
                        <li>前週比での成長率</li>
                      </ul>
                    </div>
                    <div className="mt-2 p-2 bg-white rounded border border-purple-300">
                      <p className="text-xs text-purple-800"><strong>💡 活用法：</strong>繁忙日と閑散日を把握し、シフト計画に活用できます。</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">📅 月次ダッシュボード</h4>
                    <p className="text-sm text-gray-700 mb-2">月全体の経営状況を総合的に分析します。</p>
                    <div className="text-xs text-gray-700 space-y-1">
                      <ul className="ml-4 list-disc space-y-0.5">
                        <li>月間売上・利益の推移</li>
                        <li>月次目標の達成状況</li>
                        <li>経費率の分析（FL比率など）</li>
                        <li>前月・前年同月との比較</li>
                        <li>営業利益の算出</li>
                      </ul>
                    </div>
                    <div className="mt-2 p-2 bg-white rounded border border-purple-300">
                      <p className="text-xs text-purple-800"><strong>💡 活用法：</strong>月次経費を入力すると、より正確な利益が算出されます。</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">🎯 目標設定</h4>
                    <p className="text-sm text-gray-700 mb-2">売上目標を設定して、達成度を可視化できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>サイドバーから「目標設定」を選択</li>
                      <li>店舗と期間を選択</li>
                      <li>売上目標、粗利率目標などを入力</li>
                      <li>保存すると、各ダッシュボードに反映されます</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* AIレポート */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-indigo-500" />
                  AI機能の活用
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">🤖 AIレポートの生成</h4>
                    <p className="text-sm text-gray-700 mb-2">AIが自動的に経営データを分析し、改善提案を含むレポートを作成します。</p>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li>「AIレポート」ページに移動</li>
                      <li>「新規レポート生成」ボタンをクリック</li>
                      <li>以下を選択：
                        <ul className="ml-6 mt-1 text-xs text-gray-600 list-disc">
                          <li><strong>店舗：</strong>分析対象の店舗</li>
                          <li><strong>期間：</strong>分析する期間を指定</li>
                          <li><strong>レポートタイプ：</strong>日次/週次/月次</li>
                        </ul>
                      </li>
                      <li>「レポート生成」をクリック（30秒〜1分で完成）</li>
                      <li>レポートを確認・保存・共有</li>
                    </ol>
                    <div className="mt-2 p-2 bg-white rounded border border-indigo-300">
                      <p className="text-xs text-indigo-800"><strong>💡 AIレポートの内容：</strong></p>
                      <ul className="text-xs text-gray-700 ml-4 list-disc mt-1">
                        <li>売上・利益の詳細分析</li>
                        <li>前期間との比較と変動要因</li>
                        <li>強み・弱みの診断</li>
                        <li>具体的な改善提案</li>
                        <li>次期の予測と目標設定案</li>
                      </ul>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-300">
                      <p className="text-xs text-yellow-800"><strong>⚠️ 利用制限：</strong>プランによって月間の生成回数に制限があります。残り回数はページ上部で確認できます。</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">💬 AIチャット</h4>
                    <p className="text-sm text-gray-700 mb-2">経営に関する質問をAIに相談できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「AIチャット」ページを開く</li>
                      <li>質問を入力して送信</li>
                      <li>AIが店舗データを元に回答を生成</li>
                    </ol>
                    <div className="mt-2 p-2 bg-white rounded border border-indigo-300">
                      <p className="text-xs text-indigo-800"><strong>質問例：</strong></p>
                      <ul className="text-xs text-gray-700 ml-4 list-disc mt-1">
                        <li>「先月の売上が下がった原因は？」</li>
                        <li>「食材費率を改善するには？」</li>
                        <li>「繁忙日のシフト最適化は？」</li>
                        <li>「新メニュー導入のタイミングは？」</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">📤 レポート共有</h4>
                    <p className="text-sm text-gray-700 mb-2">生成したAIレポートをチームや経営陣と共有できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>共有したいレポートを開く</li>
                      <li>「共有リンク作成」をクリック</li>
                      <li>リンクをコピーしてメールやSlackで送信</li>
                      <li>受け取った人はログインなしで閲覧可能</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* データ活用 */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-teal-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-teal-500" />
                  データ活用とエクスポート
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h4 className="font-semibold text-teal-900 mb-2">📊 データエクスポート</h4>
                    <p className="text-sm text-gray-700 mb-2">Excel形式でデータをエクスポートし、詳細な分析や報告書作成に活用できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「データ管理」→「データエクスポート」</li>
                      <li>エクスポート形式を選択（Excel/CSV）</li>
                      <li>期間と店舗を選択</li>
                      <li>「エクスポート」をクリック</li>
                    </ol>
                  </div>

                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h4 className="font-semibold text-teal-900 mb-2">🔄 Google Sheets連携</h4>
                    <p className="text-sm text-gray-700 mb-2">売上データを自動的にGoogle Sheetsに同期できます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「管理設定」→「連携設定」</li>
                      <li>「Google Sheets連携」を有効化</li>
                      <li>Googleアカウントで認証</li>
                      <li>同期先のスプレッドシートを選択</li>
                    </ol>
                  </div>

                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h4 className="font-semibold text-teal-900 mb-2">👥 チームメンバー管理</h4>
                    <p className="text-sm text-gray-700 mb-2">店長やスタッフを招待して、データ入力や閲覧を共同で行えます。</p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>「組織設定」→「メンバー管理」</li>
                      <li>「メンバーを招待」をクリック</li>
                      <li>メールアドレスと権限を設定</li>
                      <li>招待メールが送信されます</li>
                    </ol>
                    <div className="mt-2 p-2 bg-white rounded border border-teal-300">
                      <p className="text-xs text-teal-800"><strong>権限の種類：</strong></p>
                      <ul className="text-xs text-gray-700 ml-4 list-disc mt-1">
                        <li><strong>オーナー：</strong>すべての機能にアクセス可能</li>
                        <li><strong>管理者：</strong>データ入力・編集・削除が可能</li>
                        <li><strong>店長：</strong>担当店舗のデータ管理が可能</li>
                        <li><strong>閲覧者：</strong>データの閲覧のみ</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* トラブルシューティング */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-red-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-red-500" />
                  よくあるトラブルと解決方法
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">❌ データが保存できない</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-3">
                      <li>必須項目がすべて入力されているか確認</li>
                      <li>数値に不正な文字（全角数字など）が含まれていないか確認</li>
                      <li>インターネット接続を確認</li>
                      <li>ブラウザをリロード（F5）して再試行</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">📉 グラフが表示されない</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-3">
                      <li>選択した期間にデータが入力されているか確認</li>
                      <li>ブラウザのキャッシュをクリア</li>
                      <li>別のブラウザで試す（Chrome、Firefox推奨）</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">🤖 AIレポートが生成できない</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-3">
                      <li>月間の利用制限を超えていないか確認</li>
                      <li>選択した期間に十分なデータがあるか確認（最低3日分必要）</li>
                      <li>しばらく待ってから再試行（一時的なエラーの可能性）</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">🔐 ログインできない</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-3">
                      <li>メールアドレスとパスワードが正しいか確認</li>
                      <li>パスワードを忘れた場合は「パスワードを忘れた」から再設定</li>
                      <li>アカウントがロックされている場合はサポートに連絡</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 便利なヒント */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b-2 border-yellow-200 pb-2">
                  <ChevronRight className="w-5 h-5 text-yellow-500" />
                  便利なヒント集
                </h3>
                <div className="space-y-2 ml-7">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700"><strong>💡 スマホからも入力可能：</strong>外出先からでも、スマホブラウザでデータ入力できます</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700"><strong>💡 キーボードショートカット：</strong>入力フォームでTab キーを使うと、項目間を素早く移動できます</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700"><strong>💡 過去データの修正：</strong>入力ミスに気づいたら、いつでも過去のデータを修正できます</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700"><strong>💡 通知設定：</strong>目標未達成時や異常値検出時に通知を受け取れます（設定ページから有効化）</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700"><strong>💡 定期レポート：</strong>週次・月次レポートを自動生成し、メール送信する設定が可能です</p>
                  </div>
                </div>
              </section>

              {/* サポート */}
              <section className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-300 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-3">📞 サポート</h3>
                <p className="text-sm text-gray-700 mb-3">
                  このガイドで解決しない問題がある場合は、以下の方法でサポートにお問い合わせください：
                </p>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">💬 チャットサポート</p>
                    <p className="text-xs text-gray-600 mt-1">画面右下のアバターをクリックして質問してください</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">📧 メールサポート</p>
                    <p className="text-xs text-gray-600 mt-1">support@foodvalue.ai まで詳細をお送りください</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">📚 オンラインヘルプ</p>
                    <p className="text-xs text-gray-600 mt-1">より詳細なドキュメントは公式サイトをご覧ください</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
