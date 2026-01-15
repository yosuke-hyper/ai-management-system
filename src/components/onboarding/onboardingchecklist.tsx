import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Store,
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  X,
  ChevronRight,
  Play,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/authcontext';
import { useOrganization } from '../../contexts/organizationcontext';
import { useAdminData } from '../../contexts/admindatacontext';
import {
  getOnboardingProgress,
  createOnboardingProgress,
  updateOnboardingStep,
  skipOnboarding,
  loadSampleDataForUser,
  OnboardingProgress,
} from '../../services/onboardingservice';
import toast from 'react-hot-toast';

interface OnboardingChecklistProps {
  onClose?: () => void;
  minimal?: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  onClose,
  minimal = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { stores } = useAdminData();

  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSampleData, setLoadingSampleData] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [user?.id]);

  const loadProgress = async () => {
    if (!user?.id) return;

    setLoading(true);
    let data = await getOnboardingProgress(user.id);

    if (!data) {
      data = await createOnboardingProgress(user.id, organization?.id);
    }

    setProgress(data);
    setLoading(false);
  };

  const handleLoadSampleData = async () => {
    if (!user?.id || !organization?.id) {
      toast.error('組織情報が見つかりません');
      return;
    }

    const firstStore = stores[0];
    if (!firstStore) {
      toast.error('先に店舗を作成してください');
      navigate('/dashboard/settings');
      return;
    }

    setLoadingSampleData(true);
    const result = await loadSampleDataForUser(
      user.id,
      organization.id,
      firstStore.id
    );

    if (result.success) {
      toast.success(result.message);
      await loadProgress();
      navigate('/dashboard/daily');
    } else {
      toast.error(result.message);
    }

    setLoadingSampleData(false);
  };

  const handleSkip = async () => {
    if (!user?.id) return;

    await skipOnboarding(user.id);
    onClose?.();
  };

  const handleStepClick = async (step: string) => {
    if (!user?.id) return;

    switch (step) {
      case 'store':
        navigate('/dashboard/settings');
        break;
      case 'data':
        navigate('/dashboard/data');
        break;
      case 'dashboard':
        await updateOnboardingStep(user.id, 'step_dashboard_viewed');
        navigate('/dashboard/daily');
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!progress || progress.onboarding_completed || progress.onboarding_skipped) {
    return null;
  }

  const hasStore = stores.length > 0 || progress.step_store_created;
  const hasData = progress.step_first_report || progress.sample_data_loaded;
  const viewedDashboard = progress.step_dashboard_viewed;

  const steps = [
    {
      id: 'store',
      title: 'お店を登録',
      description: 'お店の名前を入力するだけ',
      completed: hasStore,
      icon: Store,
    },
    {
      id: 'data',
      title: '売上データを入れる',
      description: 'お試しデータで始められます',
      completed: hasData,
      icon: FileSpreadsheet,
    },
    {
      id: 'dashboard',
      title: '売上を見る',
      description: '今日の売上がすぐわかる',
      completed: viewedDashboard,
      icon: BarChart3,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (minimal) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">はじめての設定</span>
          </div>
          <span className="text-sm text-blue-600 font-medium">{progressPercent}%</span>
        </div>

        <div className="w-full bg-blue-100 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={step.completed}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                step.completed
                  ? 'bg-white/50 text-gray-400'
                  : 'bg-white hover:bg-blue-50 text-gray-700'
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-blue-400 flex-shrink-0" />
              )}
              <span className={`text-sm ${step.completed ? 'line-through' : 'font-medium'}`}>
                {step.title}
              </span>
              {!step.completed && (
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">はじめましょう</h2>
              <p className="text-blue-100 text-sm">かんたん3ステップ</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleSkip}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-blue-100 mb-2">
            <span>進捗</span>
            <span>{completedCount} / {steps.length} 完了</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isNext = !step.completed && steps.slice(0, index).every((s) => s.completed);

            return (
              <div
                key={step.id}
                className={`relative flex items-start gap-4 p-4 rounded-xl transition-all ${
                  step.completed
                    ? 'bg-green-50 border border-green-100'
                    : isNext
                    ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.completed
                      ? 'bg-green-100'
                      : isNext
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon
                      className={`w-6 h-6 ${
                        isNext ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        step.completed
                          ? 'bg-green-100 text-green-700'
                          : isNext
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      STEP {index + 1}
                    </span>
                    {isNext && (
                      <span className="text-xs font-medium text-blue-600 animate-pulse">
                        次はここ
                      </span>
                    )}
                  </div>

                  <h3
                    className={`font-semibold mt-1 ${
                      step.completed
                        ? 'text-green-800 line-through'
                        : isNext
                        ? 'text-gray-900'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>

                  {!step.completed && isNext && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStepClick(step.id)}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[48px]"
                      >
                        {step.id === 'store' && 'お店を登録する'}
                        {step.id === 'data' && 'ファイルから読み込む'}
                        {step.id === 'dashboard' && '売上を見にいく'}
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {step.id === 'data' && (
                        <button
                          onClick={handleLoadSampleData}
                          disabled={loadingSampleData || !hasStore}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-600 text-base font-medium rounded-lg border-2 border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                        >
                          {loadingSampleData ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                          お試しデータで始める
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {completedCount === steps.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">準備完了!</p>
                <p className="text-sm text-green-600">
                  さっそく今日の売上を見てみましょう
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleSkip}
            className="text-base text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            あとでやる
          </button>
        </div>
      </div>
    </div>
  );
};
