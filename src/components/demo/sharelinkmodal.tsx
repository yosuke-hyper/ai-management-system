import React, { useState } from 'react';
import { X, Copy, Check, Clock, Share2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { avatarToast } from '../../lib/avatartoast';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  daysValid: number;
  expiresAt: Date;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  daysValid,
  expiresAt,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      avatarToast.success('コピーしました');
    } catch (err) {
      console.error('Failed to copy:', err);
      avatarToast.error('コピーできませんでした');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Share2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            デモリンクが作成されました
          </h2>
          <p className="text-slate-600 text-sm">
            このリンクを共有して、誰でも7日間無料でお試しいただけます
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
          <div className="flex items-start gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">有効期限</p>
              <p className="text-xs text-blue-700">
                {formatDate(expiresAt)} まで（{daysValid}日間）
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            共有リンク
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-mono"
            />
            <Button
              onClick={handleCopy}
              className={`px-4 transition-all ${
                copied
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  コピー完了
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  コピー
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-900 font-medium mb-2">
            デモ環境での制限事項
          </p>
          <ul className="text-xs text-amber-800 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>閲覧専用モードで、データの編集はできません</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>サンプルデータを使用した環境です</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>7日後にリンクは自動的に無効になります</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => window.open(shareUrl, '_blank')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            デモを新しいタブで開く
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-300"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
};
