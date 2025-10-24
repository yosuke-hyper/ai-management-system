import React from 'react';
import { X, BookOpen, FileText, Target, PieChart, MessageSquare, Users, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuide: React.FC<HelpGuideProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const sections = [
    {
      icon: FileText,
      title: '日報の入力',
      role: ['admin', 'manager', 'staff'],
      steps: [
        '左メニューから「日報作成」をクリック',
        '店舗、日付を選択',
        '売上、仕入れ、各種経費を入力',
        '仕入内訳（業者別）がある場合は追加',
        '「保存」ボタンで登録完了'
      ],
      tips: [
        '金額は半角数字で入力してください',
        '仕入内訳は複数の業者を追加できます',
        '保存後も編集可能です'
      ]
    },
    {
      icon: PieChart,
      title: 'ダッシュボードの見方',
      role: ['admin', 'manager', 'staff'],
      steps: [
        '左メニューから表示期間を選択（日次・週次・月次）',
        'ヘッダーの店舗選択で表示店舗を切り替え',
        'KPIカードで主要指標を確認',
        'グラフで推移を視覚的に把握',
        'データテーブルで詳細を確認'
      ],
      tips: [
        '管理者は全店舗のデータを閲覧可能',
        'カードをクリックすると詳細分析が表示されます',
        'グラフは期間に応じて自動調整されます'
      ]
    },
    {
      icon: Target,
      title: '目標設定',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「目標設定」をクリック',
        '店舗と対象月を選択',
        '売上目標、原価率、人件費率などを入力',
        '「保存」で設定完了',
        'ダッシュボードで達成率が自動表示されます'
      ],
      tips: [
        '目標は月ごとに設定できます',
        '達成率はリアルタイムで計算されます',
        '過去の実績を参考に設定しましょう'
      ]
    },
    {
      icon: Calendar,
      title: '月次経費の入力',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「月次経費入力」をクリック',
        '店舗と対象月を選択',
        '家賃、光熱費、通信費などの固定費を入力',
        '「保存」で登録完了',
        '利益計算に自動反映されます'
      ],
      tips: [
        '月に1回入力すれば自動で計算に反映',
        '消耗品や家賃は忘れずに入力',
        '過去の月次経費をコピーして編集可能'
      ]
    },
    {
      icon: MessageSquare,
      title: 'AIチャット機能',
      role: ['admin', 'manager', 'staff'],
      steps: [
        '左メニューから「AIチャット」をクリック',
        '質問を入力（例：「今月の売上は？」）',
        'AIが業績データを分析して回答',
        '会話履歴は自動保存されます',
        '検索機能で過去の会話を検索可能'
      ],
      tips: [
        '具体的な質問ほど的確な回答が得られます',
        '「原価率を改善するには？」など提案も依頼可',
        '会話は店舗ごとに分かれています'
      ]
    },
    {
      icon: TrendingUp,
      title: 'AI分析レポート',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「AI分析レポート」をクリック',
        '「新規レポート生成」をクリック',
        '期間と店舗を選択',
        'AIが自動で詳細分析レポートを作成',
        'レポートを確認・共有・ダウンロード可能'
      ],
      tips: [
        '月末や週末にレポートを生成すると便利',
        '共有リンクで他のスタッフに共有可能',
        'レポートはPDF形式でダウンロードできます'
      ]
    },
    {
      icon: Users,
      title: 'スタッフ管理',
      role: ['admin'],
      steps: [
        '左メニューから「設定」→「スタッフ管理」',
        '「新規スタッフ追加」をクリック',
        '名前、メールアドレス、役割を入力',
        '担当店舗を割り当て',
        '「保存」で登録完了'
      ],
      tips: [
        '役割：統括（全権限）、店長、スタッフ',
        'スタッフは割り当てられた店舗のみ閲覧可',
        'パスワードは初回ログイン時に設定'
      ]
    }
  ];

  const userSections = sections.filter(section =>
    section.role.includes(user?.role || 'staff')
  );

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[99999] flex items-start justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0 }}
    >
      <div
        className="relative w-full max-w-5xl h-full max-h-screen bg-white shadow-2xl overflow-hidden flex flex-col m-0 sm:m-4 sm:rounded-xl sm:h-[96vh] sm:max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 99999 }}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between shadow-lg z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold truncate">使い方ガイド</h2>
              <p className="text-xs sm:text-sm text-blue-50 opacity-90 hidden sm:block">業務管理システムの基本操作</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 transition-colors flex-shrink-0"
            title="閉じる"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6 md:p-8 space-y-6">
          {/* Quick Start */}
          <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              はじめに
            </h3>
            <div className="space-y-4 text-gray-700">
              <p className="text-base leading-relaxed">このシステムは、日々の売上・経費を記録し、リアルタイムで業績を分析できる管理ツールです。</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-blue-100">
                  <div className="font-bold text-blue-600 mb-2 text-lg">📝 ステップ1</div>
                  <div className="text-sm text-gray-600">日報を入力して日々の業績を記録</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-purple-100">
                  <div className="font-bold text-purple-600 mb-2 text-lg">📊 ステップ2</div>
                  <div className="text-sm text-gray-600">ダッシュボードで推移を確認</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-green-100">
                  <div className="font-bold text-green-600 mb-2 text-lg">🤖 ステップ3</div>
                  <div className="text-sm text-gray-600">AIで分析・改善提案を取得</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          {userSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg hover:border-blue-300 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                    <Icon className="h-6 w-6 text-blue-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                </div>

                <div className="space-y-5">
                  {/* Steps */}
                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-blue-600">▶</span>
                      手順
                    </h4>
                    <ol className="space-y-3">
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                          <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                            {stepIndex + 1}
                          </span>
                          <span className="pt-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
                    <h4 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">💡</span>
                      ポイント
                    </h4>
                    <ul className="space-y-2">
                      {section.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="text-sm text-amber-900 flex gap-2 leading-relaxed">
                          <span className="text-amber-600 font-bold">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}

          {/* FAQ */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">❓</span>
              よくある質問
            </h3>
            <div className="space-y-5">
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. データはいつ更新されますか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 日報を保存すると即座にダッシュボードに反映されます。リアルタイムで最新データが確認できます。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 過去のデータを修正できますか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. はい、日報一覧から該当の日報を選択して編集できます。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 他の店舗のデータは見られますか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 権限により異なります。統括は全店舗、店長・スタッフは割り当てられた店舗のみ閲覧可能です。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. AIチャットの使用料金は？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. システム利用料金に含まれています。ただし、過度な使用は控えてください。</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-6 md:p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <span className="text-2xl">📞</span>
              お問い合わせ
            </h3>
            <p className="text-base text-gray-700 mb-4 leading-relaxed">
              ご不明な点がございましたら、システム管理者までお気軽にお問い合わせください。
            </p>
            <div className="text-sm text-gray-500 font-medium">
              システムバージョン: 1.0.0
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
