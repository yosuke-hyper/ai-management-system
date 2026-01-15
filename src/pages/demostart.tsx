import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/authcontext';
import { Sparkles } from 'lucide-react';

const DemoStart: React.FC = () => {
  const navigate = useNavigate();
  const { enterDemoMode, isDemoMode } = useAuth();

  useEffect(() => {
    if (!isDemoMode) {
      enterDemoMode();
    }

    const timer = setTimeout(() => {
      navigate('/dashboard/daily', { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [enterDemoMode, isDemoMode, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="relative mb-6">
          <div className="animate-pulse">
            <Sparkles className="w-20 h-20 text-blue-600 mx-auto" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">デモモードを開始中</h2>
        <p className="text-slate-600 mb-4">
          2店舗（渋谷店・新宿店 / 居酒屋業態）のサンプルデータで全機能をお試しいただけます
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span>準備中...</span>
        </div>
      </div>
    </div>
  );
};

export default DemoStart;
