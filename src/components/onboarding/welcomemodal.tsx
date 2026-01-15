import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Target,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/authcontext';
import { useTourContextOptional } from '../../contexts/tourcontext';
import {
  skipOnboarding,
  updateOnboardingStep,
} from '../../services/onboardingservice';

interface WelcomeModalProps {
  onClose: () => void;
}

type Emotion = 'normal' | 'happy' | 'thinking';

const emotionToImage: Record<Emotion, string> = {
  normal: '/images/avatar/normal.png',
  happy: '/images/avatar/happy.png',
  thinking: '/images/avatar/thinking.png',
};

interface Step {
  emotion: Emotion;
  title: string;
  messages: string[];
  features?: { icon: React.ElementType; title: string; description: string }[];
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const tourContext = useTourContextOptional();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const userName = profile?.display_name || profile?.email?.split('@')[0] || 'ユーザー';

  const steps: Step[] = [
    {
      emotion: 'happy',
      title: '初めまして!',
      messages: [
        `こんにちは、${userName}さん!`,
        'ボクの名前は「シバ」だワン!',
        'FoodValueのAIパートナーとして、あなたのお店の経営をサポートするワン!',
      ],
    },
    {
      emotion: 'normal',
      title: 'FoodValueとは?',
      messages: [
        'FoodValueは飲食店の経営を「見える化」するシステムだワン!',
        '毎日の売上や経費を入力するだけで、お店の状態がひと目でわかるようになるワン!',
        '難しい計算はボクたちに任せてほしいワン!',
      ],
    },
    {
      emotion: 'thinking',
      title: 'できること',
      messages: [
        'このシステムでできることを紹介するワン!',
      ],
      features: [
        {
          icon: TrendingUp,
          title: '売上・利益の見える化',
          description: '日別・週別・月別のトレンドを自動でグラフ化。原価率や利益率もリアルタイムで把握できるワン!',
        },
        {
          icon: Target,
          title: '目標管理',
          description: '月次目標を設定して、日々の進捗を確認できるワン。達成度が一目でわかるワン!',
        },
        {
          icon: MessageSquare,
          title: 'AIチャット相談',
          description: '経営の悩みや質問があれば、いつでもボクに相談できるワン!',
        },
        {
          icon: BarChart3,
          title: 'AI分析レポート',
          description: '売上データをAIが分析して、改善提案を自動生成するワン!',
        },
      ],
    },
    {
      emotion: 'happy',
      title: '始めましょう!',
      messages: [
        '準備はできたワン?',
        'まずは「日報入力」から始めてみるワン!',
        '1日分のデータを入力するのは3分くらいだワン。',
        'わからないことがあったら、いつでもボクに聞いてほしいワン!',
      ],
    },
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => setShowContent(true), 300);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showContent) return;
    setCurrentMessageIndex(0);
    setTypedText('');
  }, [currentStep, showContent]);

  useEffect(() => {
    if (!showContent || currentMessageIndex >= currentStepData.messages.length) return;

    const message = currentStepData.messages[currentMessageIndex];
    let charIndex = 0;
    setIsTyping(true);
    setTypedText('');

    const typeInterval = setInterval(() => {
      if (charIndex < message.length) {
        setTypedText(message.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [currentMessageIndex, showContent, currentStep]);

  const handleNextMessage = () => {
    if (isTyping) {
      setTypedText(currentStepData.messages[currentMessageIndex]);
      setIsTyping(false);
      return;
    }

    if (currentMessageIndex < currentStepData.messages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setCurrentMessageIndex(0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setCurrentMessageIndex(0);
    }
  };

  const handleStart = async () => {
    if (user?.id) {
      await updateOnboardingStep(user.id, 'step_dashboard_viewed');
    }
    onClose();
    navigate('/dashboard/report');
    setTimeout(() => {
      if (tourContext) {
        tourContext.showWelcomeModal();
      }
    }, 1500);
  };

  const handleSkip = async () => {
    if (user?.id) {
      await skipOnboarding(user.id);
    }
    onClose();
  };

  const isLastStep = currentStep === steps.length - 1;
  const isLastMessage = currentMessageIndex === currentStepData.messages.length - 1;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-slate-900/95 flex items-center justify-center z-50 p-4">
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-20px) scale(1.02); }
          }
          @keyframes bounce-in {
            0% { transform: scale(0) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(5deg); }
            70% { transform: scale(0.9) rotate(-2deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes slide-up {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          .avatar-entrance {
            animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          }
          .avatar-float {
            animation: float 3s ease-in-out infinite;
          }
          .content-slide {
            animation: slide-up 0.5s ease-out forwards;
          }
          .fade-in {
            animation: fade-in 0.4s ease-out forwards;
          }
          .sparkle {
            animation: sparkle 1.5s ease-in-out infinite;
          }
          .pulse-ring {
            animation: pulse-ring 2s ease-out infinite;
          }
        `}
      </style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-2xl w-full">
        <button
          onClick={handleSkip}
          className="absolute -top-12 right-0 text-white/50 hover:text-white/80 transition-colors text-sm"
        >
          スキップ
        </button>

        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl scale-150" />
            <div className="absolute inset-0 bg-blue-500/20 rounded-full pulse-ring" />

            <div
              className={`relative w-48 h-48 sm:w-56 sm:h-56 ${isAnimating ? 'avatar-entrance' : 'avatar-float'}`}
            >
              <img
                src={emotionToImage[currentStepData.emotion]}
                alt="シバ"
                className="w-full h-full object-contain drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 20px 40px rgba(59, 130, 246, 0.5))' }}
              />
            </div>

            {showContent && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg fade-in">
                シバ
              </div>
            )}
          </div>

          {showContent && (
            <div className="w-full content-slide">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {currentStepData.title}
                    </h2>
                    <div className="flex gap-1.5">
                      {steps.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === currentStep
                              ? 'bg-blue-400 w-6'
                              : idx < currentStep
                              ? 'bg-blue-400/60'
                              : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    className="bg-white/5 rounded-2xl p-5 min-h-[100px] cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={handleNextMessage}
                  >
                    <p className="text-white/90 text-lg leading-relaxed">
                      {typedText}
                      {isTyping && (
                        <span className="inline-block w-0.5 h-5 bg-blue-400 ml-1 animate-pulse" />
                      )}
                    </p>
                    {!isTyping && !isLastMessage && (
                      <p className="text-white/40 text-sm mt-3">
                        クリックして続きを読む...
                      </p>
                    )}
                  </div>
                </div>

                {currentStepData.features && isLastMessage && !isTyping && (
                  <div className="grid sm:grid-cols-2 gap-3 mb-6 fade-in">
                    {currentStepData.features.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={idx}
                          className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-all"
                          style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm mb-1">
                                {feature.title}
                              </h3>
                              <p className="text-white/60 text-xs leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                      currentStep === 0
                        ? 'text-white/30 cursor-not-allowed'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">戻る</span>
                  </button>

                  {isLastStep && isLastMessage && !isTyping ? (
                    <button
                      onClick={handleStart}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-500"
                      style={{ backgroundSize: '200% 100%' }}
                    >
                      日報入力を始める
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  ) : (
                    <button
                      onClick={isLastMessage && !isTyping ? handleNextStep : handleNextMessage}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                    >
                      {isTyping ? 'スキップ' : isLastMessage ? '次へ' : '続きを読む'}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-center text-white/40 text-sm mt-4">
                {isLastStep
                  ? '準備ができたらボタンをクリック!'
                  : `ステップ ${currentStep + 1} / ${steps.length}`}
              </p>
            </div>
          )}

          {!showContent && (
            <div className="text-center mt-8">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
