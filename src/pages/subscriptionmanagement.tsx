import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/organizationcontext';
import { SubscriptionStatus } from '../components/subscription/subscriptionstatus';
import { QuoteRequestForm } from '../components/subscription/quoterequestform';
import { StoreCountManagement } from '../components/organization/storecountmanagement';
import { PlanChangeDialog } from '../components/subscription/planchangedialog';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Check, TrendingUp, Users, BarChart3, Zap, Shield, Clock, Mail, Store, Calculator, Sparkles } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionservice';

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currentPlanName, setCurrentPlanName] = useState<string>();
  const [currentBillingCycle, setCurrentBillingCycle] = useState<string>();
  const [currentContractedStores, setCurrentContractedStores] = useState<number>();
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    display: string;
    price: number;
    billingCycle: 'monthly' | 'annual';
  } | null>(null);

  // 現在のプランを取得
  useEffect(() => {
    if (!organization?.id) return;

    const loadCurrentPlan = async () => {
      try {
        const subscription = await subscriptionService.getCurrentSubscription(organization.id);
        if (subscription?.plan) {
          console.log('📋 取得したプラン情報:', subscription.plan);
          setCurrentPlanName(subscription.plan.name);
          setCurrentBillingCycle(subscription.plan.billing_cycle);
          setCurrentContractedStores(subscription.contracted_stores || 1);
        } else {
          console.log('⚠️ プラン情報が見つかりません');
        }
      } catch (error) {
        console.error('❌ プラン読み込みエラー:', error);
      }
    };

    loadCurrentPlan();
  }, [organization?.id, refreshKey]);

  const pricingTiers = [
    {
      id: 'starter',
      name: 'Starter',
      monthly: 5980,
      annual: 63158,
      campaignMonthly: 3588,
      campaignAnnual: 37895,
      campaignDiscount: 40,
      monthlyEquivalent: 5263,
      campaignMonthlyEquivalent: 3158,
      annualSavings: 8602,
      campaignAnnualSavings: 5169,
      aiLimit: 50,
      recommendedStores: '1店舗',
      description: '個人店・小規模店向けの基本プラン',
      features: [
        '基本ダッシュボード（日次/週次/月次）',
        '日報入力と自動計算',
        '月次経費管理',
        '目標設定と達成度表示',
        'AIチャット分析（50回/店舗/月）',
        'AI月次レポート（月2回）'
      ]
    },
    {
      id: 'standard',
      name: 'Standard',
      monthly: 9980,
      annual: 109780,
      campaignMonthly: 6986,
      campaignAnnual: 76846,
      campaignDiscount: 30,
      monthlyEquivalent: 9162,
      campaignMonthlyEquivalent: 6404,
      annualSavings: 9980,
      campaignAnnualSavings: 6986,
      aiLimit: 300,
      recommendedStores: '1〜5店舗',
      description: '小規模チェーン向けの充実プラン',
      popular: true,
      features: [
        'Starterの全機能',
        '店舗横断比較・ランキング',
        '詳細な権限管理',
        'AIチャット分析（300回/店舗/月）',
        'AI週次レポート（週1回）',
        'Googleスプレッドシート連携',
        'メール通知・アラート'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      monthly: 14800,
      annual: 159840,
      campaignMonthly: 11840,
      campaignAnnual: 127872,
      campaignDiscount: 20,
      monthlyEquivalent: 13320,
      campaignMonthlyEquivalent: 10656,
      annualSavings: 17760,
      campaignAnnualSavings: 14208,
      aiLimit: 2000,
      recommendedStores: '5〜20店舗',
      description: '中規模チェーン・本部向けフル機能プラン',
      features: [
        'Standardの全機能',
        '本部・多店舗管理機能',
        '全店舗統合ダッシュボード',
        'エリア別・ブランド別分析',
        '異常値検知アラート',
        'AI売上・利益予測',
        'AIチャット分析（2,000回/店舗/月）',
        'AI日次レポート（毎日）',
        '優先サポート'
      ]
    }
  ];

  const handlePlanSelect = (tier: typeof pricingTiers[0]) => {
    if (!organization) {
      navigate('/signup');
      return;
    }

    const price = billingCycle === 'monthly' ? tier.campaignMonthly : tier.campaignAnnual;
    setSelectedPlan({
      name: tier.id,
      display: tier.name,
      price,
      billingCycle
    });
  };

  const handlePlanChangeSuccess = () => {
    setSelectedPlan(null);
    setRefreshKey(prev => prev + 1);
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentPlanName || !currentBillingCycle) {
      console.log('🔍 現在のプラン未設定:', { currentPlanName, currentBillingCycle, checkingPlan: planId });
      return false;
    }
    const match = currentPlanName === planId && currentBillingCycle === billingCycle;
    console.log('🔍 プラン比較:', { currentPlanName, currentBillingCycle, checkingPlan: planId, selectedCycle: billingCycle, match });
    return match;
  };

  const features = [
    {
      icon: BarChart3,
      title: 'ダッシュボード（日・週・月の見える化）',
      description: '売上・利益・原価率を自動集計。日次・週次・月次で数字が一目でわかる'
    },
    {
      icon: TrendingUp,
      title: '日報入力と集計（複数店舗一元管理）',
      description: '各店舗の日報を一箇所で管理。店舗横断の比較も簡単'
    },
    {
      icon: Zap,
      title: 'AIチャット（チャット形式で経営分析）',
      description: '気になることを質問するだけで、AIが数字を分析して回答'
    },
    {
      icon: BarChart3,
      title: 'AIレポート（月次要点サマリー自動作成）',
      description: '月次の重要ポイントをAIが自動でレポート化。経営判断を支援'
    },
    {
      icon: Users,
      title: '店舗比較・ランキング（強み・課題の発見）',
      description: '複数店舗の実績を比較。優良店の成功要因や課題店の改善点を発見'
    },
    {
      icon: Check,
      title: '目標管理（達成率を自動表示）',
      description: '売上・利益の目標を設定。達成率をリアルタイムで確認'
    },
    {
      icon: Shield,
      title: 'アカウント権限（オーナー・店長・スタッフ）',
      description: '役割に応じた権限設定。データの閲覧・編集を適切に管理'
    },
    {
      icon: Clock,
      title: '履歴・監査ログ（いつ・だれが・なにをしたか）',
      description: '全ての操作履歴を記録。トラブル時の原因究明や監査に対応'
    }
  ];

  const valueProps = [
    {
      icon: BarChart3,
      title: '数字が自動でわかる',
      description: '売上・原価・利益を入力するだけで、粗利率や達成率を自動計算'
    },
    {
      icon: Users,
      title: '誰でも使える',
      description: 'シンプルな画面設計。スタッフ全員が迷わず使えるUI'
    },
    {
      icon: TrendingUp,
      title: '複数店舗を一元管理',
      description: '全店舗の数字を1つの画面で確認。店舗間の比較も簡単'
    },
    {
      icon: Zap,
      title: 'AIで時間短縮',
      description: '月次レポート作成や分析をAIが自動化。経営判断に集中できる'
    }
  ];

  const faqItems = [
    {
      question: '最低契約期間はありますか？',
      answer: 'ありません。いつでも解約可能です。'
    },
    {
      question: '支払い方法は何がありますか？',
      answer: '月払い・年払いに対応しています。クレジットカード決済をご利用いただけます。年払いは約10%割引でお得です。'
    },
    {
      question: 'プランはどう選べばいいですか？',
      answer: 'Starterは個人店・小規模店、Standardは複数店舗の比較分析が必要な方、Premiumは本部機能や高度な予測が必要な中規模チェーン向けです。店舗数ではなく、必要な機能で選んでください。'
    },
    {
      question: 'AI利用回数の上限はありますか？',
      answer: 'はい。Starterは月50回、Standardは月300回、Premiumは月2,000回までご利用いただけます。上限に達した場合は、プランのアップグレードをご検討ください。'
    },
    {
      question: 'オプション料金はかかりますか？',
      answer: 'いいえ。各プランの機能はすべて標準搭載されており、追加料金は一切かかりません。'
    },
    {
      question: '店舗数に制限はありますか？',
      answer: 'いいえ、店舗数に上限はありません。どのプランでも自由に店舗を追加できます。ただし、5店舗以上を管理される場合はStandardまたはPremiumプランを推奨します。'
    },
    {
      question: '1店舗でもPremiumプランを選べますか？',
      answer: 'はい、可能です。店舗数ではなく、必要な機能（予測分析、本部管理機能など）に応じてプランをお選びいただけます。'
    },
    {
      question: 'プランは後から変更できますか？',
      answer: 'はい、いつでもプラン変更が可能です。組織設定から上位プランへのアップグレード、または下位プランへのダウングレードができます。'
    },
    {
      question: '店舗を後から追加・削除できますか？',
      answer: 'はい、可能です。組織設定からいつでも店舗の追加・削除ができます。料金はプランによって決まるため、店舗数の増減で料金が変わることはありません。'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/organization')}
            className="mb-4 bg-white hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            設定に戻る
          </Button>
        </div>

        {organization && (
          <div className="space-y-6 mb-8">
            <SubscriptionStatus refreshKey={refreshKey} />
            <StoreCountManagement onUpdate={() => setRefreshKey(prev => prev + 1)} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-16 text-center">
            {/* キャンペーン告知バナー */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl mb-6 inline-block animate-pulse shadow-2xl">
              <div className="flex items-center gap-2 text-sm md:text-base font-bold">
                <Sparkles className="w-5 h-5" />
                <span>期間限定キャンペーン実施中！2025年12月〜2026年5月まで最大40%OFF</span>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              必要な機能で選べる3つのプラン
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              個人店から多店舗チェーンまで、規模と目的に合わせて最適なプランを
            </p>

            {/* 月払い/年払い切り替え */}
            {organization && (
              <div className="flex justify-center mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 inline-flex">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-blue-700 shadow-lg'
                        : 'text-white hover:text-blue-100'
                    }`}
                  >
                    月払い
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      billingCycle === 'annual'
                        ? 'bg-white text-blue-700 shadow-lg'
                        : 'text-white hover:text-blue-100'
                    }`}
                  >
                    年払い
                    <Badge className="bg-green-500 text-white text-xs">約10〜12%OFF</Badge>
                  </button>
                </div>
              </div>
            )}

            {/* プランカード */}
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 mb-8">
              {pricingTiers.map((tier) => {
                const originalPrice = billingCycle === 'monthly' ? tier.monthly : tier.annual;
                const campaignPrice = billingCycle === 'monthly' ? tier.campaignMonthly : tier.campaignAnnual;
                const isCurrent = isCurrentPlan(tier.id);
                const monthlyEquiv = billingCycle === 'annual' ? tier.campaignMonthlyEquivalent : undefined;
                const annualSave = billingCycle === 'annual' ? tier.campaignAnnualSavings : undefined;

                return (
                  <div
                    key={tier.id}
                    className={`bg-white text-gray-900 rounded-2xl px-6 py-6 shadow-2xl relative flex-1 max-w-xs ${
                      tier.popular ? 'ring-4 ring-yellow-400' : ''
                    } ${isCurrent ? 'ring-4 ring-green-500' : ''}`}
                  >
                    {/* キャンペーンバッジ */}
                    <Badge className="absolute -top-3 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg animate-pulse">
                      期間限定 {tier.campaignDiscount}%OFF
                    </Badge>

                    {tier.popular && !isCurrent && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
                        人気No.1
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                        <Check className="w-3 h-3 mr-1" />
                        現在のプラン
                      </Badge>
                    )}
                    <div className="text-center mb-4 mt-2">
                      <div className="text-sm text-gray-600 mb-1">{tier.name}プラン</div>

                      {/* 元の価格（取り消し線） */}
                      <div className="text-lg text-gray-400 line-through">
                        ￥{originalPrice.toLocaleString()}
                      </div>

                      {/* キャンペーン価格 */}
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-red-600">￥{campaignPrice.toLocaleString()}</span>
                        <span className="text-lg text-gray-600 ml-1">
                          {billingCycle === 'monthly' ? '/ 月' : '/ 年'}
                        </span>
                      </div>
                      {billingCycle === 'annual' && monthlyEquiv && annualSave && (
                        <div className="text-xs text-green-600 mt-1">
                          月額換算 ￥{monthlyEquiv.toLocaleString()} (￥{annualSave.toLocaleString()}お得)
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">{tier.description}</div>
                    </div>

                    {/* 機能リスト（全て表示） */}
                    <div className="my-4 space-y-2 text-left">
                      <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Check className="w-3 h-3 text-blue-600" />
                        含まれる機能
                      </div>
                      {tier.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* 推奨店舗数 */}
                    <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-blue-900">
                        <Store className="w-3 h-3" />
                        <span className="font-semibold">推奨: {tier.recommendedStores}</span>
                      </div>
                    </div>

                    {organization && (
                      <div className="mt-4">
                        <Button
                          onClick={() => handlePlanSelect(tier)}
                          disabled={isCurrent}
                          className={`w-full ${
                            isCurrent
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : tier.popular
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              選択中
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              このプランを選択
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!organization && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6 rounded-xl shadow-lg font-bold"
                >
                  7日間無料で試す
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowQuoteForm(true)}
                  className="bg-white/10 text-white border-white hover:bg-white/20 text-lg px-8 py-6 rounded-xl font-bold backdrop-blur-sm"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  法人契約のご相談
                </Button>
              </div>
            )}

            <p className="text-blue-100 text-sm">
              {organization ? 'プランはいつでも変更可能です' : 'クレジットカード情報の登録は不要です'}
            </p>
          </div>

          {/* 残りのセクションは省略（長すぎるため） */}
          <div className="px-8 py-12">
            <div className="max-w-5xl mx-auto">
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">
                  選ばれる4つの理由
                </h2>
                <p className="text-center text-gray-600 mb-10">
                  経営の見える化から改善まで、必要な機能をオールインワンで
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {valueProps.map((prop, index) => (
                    <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                        <prop.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">{prop.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{prop.description}</p>
                    </Card>
                  ))}
                </div>
              </section>

              <section className="mb-16">
                <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">
                  よくある質問
                </h2>
                <div className="space-y-4">
                  {faqItems.map((item, index) => (
                    <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-start">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                          Q
                        </span>
                        {item.question}
                      </h3>
                      <p className="text-gray-700 ml-9 leading-relaxed flex items-start">
                        <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                          A
                        </span>
                        {item.answer}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {showQuoteForm && <QuoteRequestForm onClose={() => setShowQuoteForm(false)} />}
      {selectedPlan && organization && (
        <PlanChangeDialog
          currentPlanName={currentPlanName}
          currentBillingCycle={currentBillingCycle}
          currentContractedStores={currentContractedStores}
          newPlanName={selectedPlan.name}
          newPlanDisplay={selectedPlan.display}
          newPlanPrice={selectedPlan.price}
          newBillingCycle={selectedPlan.billingCycle}
          organizationId={organization.id}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  );
}
