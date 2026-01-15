import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, MessageSquare, HelpCircle, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface TourCompletionModalProps {
  onClose: () => void;
  tourName: string;
}

export function TourCompletionModal({ onClose, tourName }: TourCompletionModalProps) {
  const navigate = useNavigate();

  const getTitle = () => {
    switch (tourName) {
      case 'dashboard':
      case 'firstTime':
        return 'ダッシュボードの基本操作';
      case 'reportForm':
        return '日報入力';
      case 'settings':
        return '設定画面';
      case 'aiChat':
        return 'AIチャット';
      default:
        return 'ガイド';
    }
  };

  const handleGoToChat = () => {
    onClose();
    navigate('/dashboard/chat');
  };

  const handleGoToHelp = () => {
    onClose();
    navigate('/dashboard/support');
  };

  const handleGoToReport = () => {
    onClose();
    navigate('/dashboard/report/new');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative z-10 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {getTitle()}の説明が完了しました!
          </h2>

          <p className="text-gray-600 mb-6">
            基本的な使い方をご理解いただけたと思います。
            <br />
            次のステップに進みましょう!
          </p>

          <div className="w-full space-y-3">
            {(tourName === 'dashboard' || tourName === 'firstTime') && (
              <Button
                onClick={handleGoToReport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <FileText className="w-5 h-5 mr-2" />
                日報を入力してみる
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleGoToChat}
              className="w-full"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              AIに質問してみる
            </Button>

            <Button
              variant="ghost"
              onClick={handleGoToHelp}
              className="w-full text-gray-600"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              詳しい使い方を見る
            </Button>

            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
