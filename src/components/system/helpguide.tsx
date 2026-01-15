import React from 'react';
import { X, BookOpen, FileText, Target, PieChart, MessageSquare, Users, Calendar, TrendingUp, Building2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/authcontext';

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
        '営業区分（昼・夜・1日）を選択',
        '売上、客数、仕入れ、各種経費を入力',
        '釣り銭・現金売上・カード売上などの詳細を記録',
        '「業者別仕入内訳を追加」で詳細な仕入データを記録',
        '業者は複数追加可能（野菜・肉、鮮魚、米等のカテゴリ別）',
        '報告内容（任意）を記入して「保存」'
      ],
      tips: [
        '金額は半角数字で入力してください',
        '昼・夜を分けて記録すると時間帯別の分析が可能',
        '釣り銭は店舗設定で設定した金額がデフォルト表示',
        '業者別仕入を登録すると詳細な原価分析が可能',
        '保存後もダッシュボードから編集可能です',
        '過去の日報一覧から編集ボタンで修正できます'
      ]
    },
    {
      icon: PieChart,
      title: 'ダッシュボードの見方',
      role: ['admin', 'manager', 'staff', 'viewer'],
      steps: [
        '左メニューから表示期間を選択（日次・週次・月次）',
        'ヘッダーの店舗選択で表示店舗を切り替え',
        'KPIカードで主要指標を確認（売上、原価率、人件費率、営業利益等）',
        'カレンダーヒートマップで売上傾向を視覚化',
        'グラフで推移を分析（売上・経費推移、損益分岐点等）',
        'データテーブルで日別詳細を確認',
        '過去の日報一覧から編集・削除が可能'
      ],
      tips: [
        '管理者・マネージャーは全店舗のデータを閲覧可能',
        'スタッフ・閲覧者は割り当てられた店舗のみ表示',
        '目標設定がある場合、達成率が自動表示されます',
        'P/L詳細モーダルで損益計算書を確認可能'
      ]
    },
    {
      icon: Target,
      title: '目標設定',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「目標設定」をクリック',
        '店舗と対象月を選択',
        '月次目標: 売上目標、原価率、人件費率、営業利益率を入力',
        '日別目標: 特定の日の売上目標を個別設定可能',
        '「保存」で設定完了',
        'ダッシュボードで達成率が自動表示されます'
      ],
      tips: [
        '月次目標は月ごとに設定できます',
        '日別目標は繁忙日や特別な日に設定すると便利',
        '達成率はリアルタイムで計算され、KPIカードに表示',
        'ブランド別にデフォルト目標を設定可能'
      ]
    },
    {
      icon: Calendar,
      title: '月次固定費入力',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「月次固定費入力」をクリック',
        '店舗と対象月を選択',
        '社員人件費、アルバイト人件費、家賃、光熱費、消耗品等を入力',
        '「経費ベースライン設定」で標準経費を設定',
        'ベースラインを設定すると、月次固定費入力時にデフォルト値として使用',
        '「保存」で登録完了し、利益計算に自動反映'
      ],
      tips: [
        '最初はサンプルデータで操作感を確認し、慣れたら正式な固定費を入力してください',
        '経費ベースラインを設定すると毎月の入力が楽になります',
        '家賃や固定費はベースラインに設定推奨',
        '月次固定費は営業利益の計算に使用されます',
        '正確な固定費を入力することで、より精度の高い損益分析が可能になります'
      ]
    },
    {
      icon: MessageSquare,
      title: 'AIチャット機能',
      role: ['admin', 'manager', 'staff'],
      steps: [
        '左メニューから「AIチャット」をクリック',
        'ヘッダーで対象店舗を選択',
        '質問を入力（例：「今月の売上は？」「原価率の推移は？」）',
        'AIが業績データを分析して回答',
        '会話履歴は自動保存され、後から検索可能',
        'アーカイブ機能で過去の会話を管理'
      ],
      tips: [
        '使用制限: 店舗ごとに月間100回まで利用可能（デフォルト）',
        '具体的な質問ほど的確な回答が得られます',
        '改善提案や経営アドバイスも依頼できます',
        '使用回数は画面右上のインジケーターで確認',
        '管理者は「店舗別AI使用制限管理」で店舗ごとの上限を変更可能',
        'プランによってAI使用量の上限が異なります'
      ]
    },
    {
      icon: TrendingUp,
      title: 'AI分析レポート',
      role: ['admin', 'manager'],
      steps: [
        '左メニューから「AI分析レポート」をクリック',
        '「新規レポート生成」をクリック',
        '期間（開始日〜終了日）と店舗を選択',
        'レポートのタイトルを入力（任意）',
        'AIが自動で詳細分析レポートを作成（売上分析、コスト分析、改善提案等）',
        'レポートを確認・編集・共有・ダウンロード'
      ],
      tips: [
        '月末や週末にレポートを生成すると振り返りに便利',
        '共有リンクを生成して他のメンバーに共有可能',
        'レポートの可視性設定: プライベート/組織内共有を選択',
        'レポートの削除はオーナー・管理者・マネージャーのみ可能',
        '定期レポート機能で自動生成・メール送信も可能（管理者設定）'
      ]
    },
    {
      icon: Users,
      title: '組織・メンバー管理',
      role: ['admin'],
      steps: [
        '左メニューから「設定」→「組織設定」',
        '「メンバー管理」タブで組織メンバーを確認',
        '「招待」ボタンでメールアドレスを入力して招待',
        '役割を選択: オーナー/管理者/マネージャー/スタッフ/閲覧者',
        '招待されたユーザーはメールのリンクからアカウント作成',
        'メンバー一覧から役割変更や削除が可能'
      ],
      tips: [
        'オーナー: 組織の最高権限、全機能利用可能、メンバー管理・設定変更可',
        '管理者: 全機能利用可能、設定変更・メンバー管理可',
        'マネージャー: 日報・目標・レポート管理が可能',
        'スタッフ: 日報入力・閲覧のみ',
        '閲覧者: データ閲覧のみ（編集不可）',
        '組織はマルチテナント対応で完全にデータ分離'
      ]
    },
    {
      icon: Building2,
      title: 'ブランド・店舗管理',
      role: ['admin'],
      steps: [
        '左メニューから「管理者設定」→「ブランド管理」',
        '「新規ブランド追加」で業態を追加（レストラン、カフェ等）',
        'ブランドごとにデフォルト目標値を設定（原価率、人件費率等）',
        'アイコンやカラーでブランドを視覚的に区別',
        '「店舗管理」で各店舗にブランドを割り当て',
        '店舗ごとに釣り銭の初期金額を設定可能',
        '店舗ごとに担当者・休業日を設定可能'
      ],
      tips: [
        '複数業態を運営している場合、ブランド管理が便利',
        'ブランドごとに異なる目標設定が可能',
        '店舗は複数のブランドに分類可能',
        '釣り銭を設定すると日報入力時に自動で初期値として表示',
        '業者管理も店舗ごとにカスタマイズ可能',
        '休業日設定で営業カレンダーを管理'
      ]
    },
    {
      icon: Settings,
      title: '管理者設定',
      role: ['admin'],
      steps: [
        '左メニューから「管理者設定」をクリック',
        '店舗別AI使用制限管理: 店舗ごとの月間AI使用上限を設定',
        'ブランド管理: 業態の追加・編集・目標値設定',
        '監査ログ: システムの重要な操作履歴を確認',
        'エラーログ: システムエラーやAPI障害を監視',
        'レポートスケジュール: 定期的なAIレポート生成・送信を設定',
        'サブスクリプション管理: プランの確認と変更'
      ],
      tips: [
        '店舗別AI使用制限でコストを細かく管理できます',
        '監査ログで不正操作や問題を追跡可能',
        'エラーログでシステムの健全性を監視',
        'リアルタイムエラーモニタリングで即座に問題を検知',
        '定期レポート機能で自動的に分析レポートを送信',
        'サブスクリプションプランでAI使用量が変わります'
      ]
    }
  ];

  // オーナー・デモモード・未ログイン時は全セクション表示
  const userSections = !user || user.email?.includes('demo-') || user?.role === 'owner'
    ? sections
    : sections.filter(section => section.role.includes(user?.role || 'staff'));

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
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. はい、ダッシュボードの過去の日報一覧から編集ボタンをクリックして修正できます。管理者・マネージャー・スタッフは編集可能ですが、閲覧者は編集できません。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 他の店舗のデータは見られますか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 権限により異なります。管理者・マネージャーは全店舗のデータを閲覧可能。スタッフ・閲覧者は割り当てられた店舗のみ閲覧できます。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. AIチャットの使用制限は？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 店舗ごとに月間100回まで利用可能です（デフォルト）。使用回数は画面右上のインジケーターで確認できます。管理者は「管理者設定」→「店舗別AI使用制限管理」で店舗ごとの上限を変更できます。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. デモモードとは何ですか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. システムを試用できるモードです。サンプルデータが用意されており、実際の操作感を確認できます。デモデータは保存されず、セッション終了時にリセットされます。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. Google Sheets連携は可能ですか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. はい、Google Sheets APIを設定することで、日報データを自動的にスプレッドシートに同期できます。詳細は管理者にお問い合わせください。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 複数のブランドを管理できますか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. はい、ブランド管理機能で複数の業態（レストラン、カフェ、居酒屋等）を管理できます。ブランドごとに異なる目標値を設定可能です。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 昼・夜の営業区分とは何ですか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 1日を昼と夜に分けて日報を記録できる機能です。営業区分を「昼」「夜」「1日」から選択でき、時間帯別の売上・客数・経費を分析できます。昼と夜で異なる業態を運営する店舗に便利です。</div>
              </div>
              <div className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="font-bold text-gray-900 mb-2 text-base">Q. 釣り銭設定とは何ですか？</div>
                <div className="text-sm text-gray-600 leading-relaxed pl-4">A. 店舗ごとに釣り銭の初期金額を設定できる機能です。店舗管理で釣り銭金額を設定すると、日報入力時に自動で初期値として表示され、入力の手間を省けます。毎日同じ金額で準備する店舗に便利です。</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-6 md:p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <span className="text-2xl">📞</span>
              お問い合わせ・サポート
            </h3>
            <p className="text-base text-gray-700 mb-4 leading-relaxed">
              ご不明な点やトラブルがございましたら、組織の管理者までお気軽にお問い合わせください。
            </p>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <strong>主な機能：</strong> 日報管理 / ダッシュボード / AI分析 / 目標設定 / マルチテナント
              </div>
              <div className="text-xs text-gray-500 font-medium">
                システムバージョン: 3.0.0 | 最終更新: 2025年12月
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
