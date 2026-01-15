import React, { useEffect, useState } from 'react';
import { Sparkles, Clock, ExternalLink, MessageSquare, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/authcontext';
import { useDemoAIUsage, getDemoSessionId } from '../../hooks/usedemoaiusage';
import { avatarToast } from '../../lib/avatartoast';

interface DemoBannerProps {
  expiresAt: string;
  shareToken?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ expiresAt, shareToken }) => {
  const navigate = useNavigate();
  const { allStores } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  // Get demo AI usage
  const demoSessionId = getDemoSessionId();
  const { status: aiUsageStatus } = useDemoAIUsage(demoSessionId);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setDaysRemaining(0);
        setHoursRemaining(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setDaysRemaining(days);
      setHoursRemaining(hours);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const getUrgencyClass = () => {
    if (daysRemaining === 0) {
      return 'from-red-600 to-red-700 border-red-800';
    } else if (daysRemaining <= 2) {
      return 'from-orange-600 to-orange-700 border-orange-800';
    }
    return 'from-blue-600 to-blue-700 border-blue-800';
  };

  const getTimeDisplay = () => {
    if (daysRemaining === 0 && hoursRemaining === 0) {
      return '期限切れ';
    } else if (daysRemaining === 0) {
      return `残り ${hoursRemaining} 時間`;
    } else {
      return `残り ${daysRemaining} 日`;
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getUrgencyClass()} text-white py-3 px-4 shadow-md border-b-4`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold mb-0.5 flex items-center gap-2">
                デモ体験モード
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getTimeDisplay()}
                </span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs opacity-90">
                  {allStores.length}店舗のサンプルデータで全機能をご覧いただけます
                </p>
                {allStores.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {allStores.map((store) => (
                      <span
                        key={store.id}
                        className="text-xs bg-white/20 px-2 py-0.5 rounded flex items-center gap-1"
                      >
                        <span>{store.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                {aiUsageStatus && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      AIチャット {aiUsageStatus.chat.remaining}/{aiUsageStatus.chat.limit}
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      レポート {aiUsageStatus.report.remaining}/{aiUsageStatus.report.limit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shareToken && (
              <Button
                onClick={async () => {
                  try {
                    const shareUrl = `${window.location.origin}/demo/${shareToken}`;
                    await navigator.clipboard.writeText(shareUrl);
                    avatarToast.success('コピーしました');
                  } catch (err) {
                    console.error('Failed to copy:', err);
                    avatarToast.error('コピーできませんでした');
                  }
                }}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                リンクをコピー
              </Button>
            )}
            <Button
              onClick={() => navigate('/signup')}
              variant="outline"
              size="sm"
              className="bg-white text-blue-600 border-white hover:bg-blue-50 font-semibold text-xs"
            >
              本登録する（無料）
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
