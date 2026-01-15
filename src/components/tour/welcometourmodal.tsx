import React, { useState } from 'react';
import { Compass, X, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface WelcomeTourModalProps {
  onStartTour: () => void;
  onDismiss: () => void;
  onNeverShow: () => void;
}

export function WelcomeTourModal({ onStartTour, onDismiss, onNeverShow }: WelcomeTourModalProps) {
  const [showNeverOption, setShowNeverOption] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
      />
      <Card className="relative z-10 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Compass className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            FoodValue AIへようこそ!
          </h2>

          <p className="text-gray-600 mb-6">
            はじめてのご利用ありがとうございます。
            <br />
            1分程度の簡単なガイドで、主要な機能をご案内します。
          </p>

          <div className="w-full space-y-3">
            <Button
              onClick={onStartTour}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Compass className="w-5 h-5 mr-2" />
              ガイドを始める
            </Button>

            <Button
              variant="outline"
              onClick={onDismiss}
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              後で見る
            </Button>

            {!showNeverOption ? (
              <button
                onClick={() => setShowNeverOption(true)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                もう表示しない
              </button>
            ) : (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">
                  本当に表示しませんか?
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNeverShow}
                  className="text-gray-600"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  はい、表示しない
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 w-full">
            <p className="text-xs text-gray-500">
              ガイドはいつでもサイドバーの「使い方ガイド」から再開できます
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
