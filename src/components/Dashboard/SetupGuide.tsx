import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, Copy, CheckCircle, AlertCircle, Book } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const steps = [
    {
      title: "Google Cloud Consoleでプロジェクト作成",
      description: "新しいプロジェクトを作成してGoogle Sheets APIを有効化",
      link: "https://console.cloud.google.com/",
      action: "Google Cloud Console を開く"
    },
    {
      title: "Google Sheets APIを有効化",
      description: "APIとサービス → ライブラリ → Google Sheets API → 有効にする",
      steps: [
        "「APIとサービス」→「ライブラリ」をクリック",
        "「Google Sheets API」を検索",
        "Google Sheets APIを選択して「有効にする」"
      ]
    },
    {
      title: "APIキーを作成",
      description: "APIとサービス → 認証情報 → 認証情報を作成 → APIキー",
      copyText: "AIzaSyD...",
      steps: [
        "「APIとサービス」→「認証情報」をクリック",
        "「認証情報を作成」→「APIキー」を選択",
        "作成されたAPIキーをコピー"
      ]
    },
    {
      title: "シートの共有設定",
      description: "テンプレートシートを「リンクを知っている全員が閲覧可能」に設定",
      link: "https://docs.google.com/spreadsheets/d/1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco/edit",
      action: "テンプレートシートを開く",
      steps: [
        "シートを開いて「共有」ボタンをクリック",
        "「制限付きアクセス」を「リンクを知っている全員」に変更",
        "権限を「閲覧者」または「編集者」に設定"
      ]
    },
    {
      title: "環境変数の設定",
      description: ".envファイルにAPIキーを設定",
      copyText: `VITE_GOOGLE_SHEETS_API_KEY=ここにAPIキーをペースト
VITE_GOOGLE_SHEET_ID=1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco`,
      steps: [
        ".envファイルを開く",
        "VITE_GOOGLE_SHEETS_API_KEYに取得したAPIキーを設定",
        "アプリケーションを再起動"
      ]
    }
  ];

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Book className="w-4 h-4" />
        設定ガイド
      </button>

      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Google Sheets API 設定ガイド</h2>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">設定完了までの所要時間: 約10分</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Google Cloud Consoleでの操作が初めての方でも簡単に設定できます。
                    </p>
                  </div>
                </div>
              </div>

              {steps.map((step, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {step.steps && (
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
                        {step.steps.map((substep, substepIndex) => (
                          <li key={substepIndex}>{substep}</li>
                        ))}
                      </ol>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {step.link && step.action && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {step.action}
                        </a>
                      )}

                      {step.copyText && (
                        <button
                          onClick={() => copyToClipboard(step.copyText!, index)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {copiedStep === index ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              コピー
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {step.copyText && (
                      <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                          {step.copyText}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">設定完了後</h3>
                    <p className="text-sm text-green-700 mt-1">
                      日次報告が自動的にGoogle Sheetsに保存され、リアルタイムでデータ分析ができるようになります！
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  設定ガイドを閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};