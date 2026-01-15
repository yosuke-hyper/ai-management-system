import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  HelpCircle,
  ExternalLink,
  Monitor,
  Loader2,
} from 'lucide-react';

interface POSSystem {
  id: string;
  name: string;
  logo: string;
  color: string;
  exportPath: string[];
  columns: string[];
  tips: string[];
  sampleUrl?: string;
}

const POS_SYSTEMS: POSSystem[] = [
  {
    id: 'smaregi',
    name: 'スマレジ',
    logo: '📱',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    exportPath: [
      '「日別売上レポート」を出力',
      '期間を指定してCSV形式でエクスポート',
      '店舗単位でファイルを分ける',
    ],
    columns: ['日付', '売上金額', '客数', '客単価'],
    tips: [
      '税込金額で出力されます',
      '複数店舗の場合は店舗ごとに出力',
      '見つからない場合: サポートに「日別売上CSV」と問い合わせ',
    ],
  },
  {
    id: 'airregister',
    name: 'Airレジ',
    logo: '🔵',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    exportPath: [
      '「売上集計 - 日別」レポートを出力',
      '期間を選んでCSVエクスポート',
      '店舗切り替えで個別に出力',
    ],
    columns: ['取引日', '売上合計', '取引件数', '客数'],
    tips: [
      '「売上合計」が税込売上に該当',
      '仕入データは別の「仕入管理」から',
      '見つからない場合: サポートに「日別売上CSV」と問い合わせ',
    ],
  },
  {
    id: 'square',
    name: 'Square',
    logo: '⬛',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    exportPath: [
      '「売上サマリー」レポートを出力',
      '期間指定してCSVでエクスポート',
    ],
    columns: ['Date', 'Gross Sales', 'Net Sales', 'Transactions'],
    tips: [
      'Gross Sales = 総売上（返金前）',
      'Net Sales = 純売上（返金後）',
      '日付形式が異なる場合はExcelで変換',
    ],
  },
  {
    id: 'manual',
    name: '手入力 / その他POS',
    logo: '✏️',
    color: 'bg-green-100 text-green-700 border-green-200',
    exportPath: [
      'テンプレートをダウンロード',
      'Excelで売上データを入力',
      'CSV形式で保存してアップロード',
    ],
    columns: ['日付', '売上', '客数', '仕入', '人件費'],
    tips: [
      '日付: YYYY-MM-DD形式（例: 2025-01-15）',
      '金額: 数値のみ、カンマなし',
      '空欄は0として処理',
    ],
  },
];

interface POSImportWizardProps {
  onComplete: (posId: string) => void;
  onBack?: () => void;
}

export const POSImportWizard: React.FC<POSImportWizardProps> = ({
  onComplete,
  onBack,
}) => {
  const [step, setStep] = useState(1);
  const [selectedPOS, setSelectedPOS] = useState<POSSystem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePOSSelect = (pos: POSSystem) => {
    setSelectedPOS(pos);
    setStep(2);
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStep(3);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleComplete = () => {
    if (selectedPOS) {
      onComplete(selectedPOS.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">CSVインポート</h2>
            <p className="text-green-100 text-sm">
              ステップ {step} / 3 - {step === 1 ? 'POSを選択' : step === 2 ? 'ファイルを選択' : '確認'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              お使いのPOSレジを選択してください。出力方法をご案内します。
            </p>

            <div className="grid grid-cols-2 gap-3">
              {POS_SYSTEMS.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => handlePOSSelect(pos)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${pos.color}`}
                >
                  <span className="text-2xl">{pos.logo}</span>
                  <div>
                    <p className="font-semibold">{pos.name}</p>
                    <p className="text-xs opacity-70">
                      {pos.columns.slice(0, 3).join(' / ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-4"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </button>
            )}
          </div>
        )}

        {step === 2 && selectedPOS && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{selectedPOS.logo}</span>
              <div>
                <p className="font-medium text-gray-900">{selectedPOS.name}</p>
                <p className="text-xs text-gray-500">からのインポート</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">CSV出力手順</h3>
              </div>
              <ol className="space-y-2">
                {selectedPOS.exportPath.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-blue-800 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-medium text-amber-900">ヒント</h3>
              </div>
              <ul className="space-y-1">
                {selectedPOS.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">・</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                CSVファイルをドラッグ&ドロップ
              </p>
              <p className="text-sm text-gray-500 mb-4">または</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                ファイルを選択
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            {selectedPOS.id === 'manual' && (
              <a
                href="#"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
                テンプレートをダウンロード
              </a>
            )}

            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              POS選択に戻る
            </button>
          </div>
        )}

        {step === 3 && selectedPOS && file && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">ファイル選択完了</p>
                  <p className="text-sm text-green-600">{file.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-3">取り込み内容の確認</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500">POSシステム</p>
                  <p className="font-medium">{selectedPOS.name}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500">ファイル名</p>
                  <p className="font-medium truncate">{file.name}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500">ファイルサイズ</p>
                  <p className="font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500">取り込み先</p>
                  <p className="font-medium">日報データ</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">インポート前の確認</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>・同じ日付のデータは上書きされます</li>
                    <li>・インポート後も履歴から復元可能です</li>
                    <li>・エラーがあった行はスキップされます</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setStep(2);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ファイルを変更
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                インポート開始
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
