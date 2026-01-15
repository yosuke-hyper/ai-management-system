import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '../../contexts/organizationcontext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Store, AlertCircle, Info, Plus, Minus, Calculator, Check, X, Sparkles } from 'lucide-react';
import { subscriptionService, SubscriptionLimits } from '../../services/subscriptionservice';

interface StoreCountManagementProps {
  onUpdate?: () => void;
  refreshKey?: number;
}

export function StoreCountManagement({ onUpdate, refreshKey }: StoreCountManagementProps = {}) {
  const { organization } = useOrganization();
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [currentPlan, setCurrentPlan] = useState<{
    name: string;
    displayName: string;
    price: number;
    billingCycle: 'monthly' | 'annual';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [newStoreCount, setNewStoreCount] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [contractedStores, setContractedStores] = useState(1);

  useEffect(() => {
    if (organization) {
      loadPlanData();
    }
  }, [organization?.id, refreshKey]);

  // 店舗数更新イベントをリッスン
  useEffect(() => {
    const handleStoreCountUpdate = () => {
      console.log('📡 StoreCountManagement: 店舗数更新イベントを受信しました');
      loadPlanData();
    };

    window.addEventListener('store-count-updated', handleStoreCountUpdate);

    return () => {
      window.removeEventListener('store-count-updated', handleStoreCountUpdate);
    };
  }, [organization?.id]);

  const loadPlanData = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const limitsData = await subscriptionService.getSubscriptionLimits(organization.id);
      setLimits(limitsData);

      const subscription = await subscriptionService.getCurrentSubscription(organization.id);

      if (subscription && subscription.plan) {
        const billingCycle = subscription.plan.billing_cycle as 'monthly' | 'annual';

        const plan = {
          name: subscription.plan.name,
          displayName: subscription.plan.display_name,
          price: subscription.plan.price,
          billingCycle
        };

        setCurrentPlan(plan);
        setContractedStores(limitsData?.contractedStores || 1);
        setNewStoreCount(limitsData?.contractedStores || 1);
      } else {
        setError('サブスクリプション情報が見つかりません');
      }
    } catch (err: any) {
      console.error('プランデータの読み込み失敗:', err);
      setError(err.message || 'プランデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const pricing = useMemo(() => {
    if (!currentPlan) return null;
    return subscriptionService.calculatePriceForStores(
      currentPlan.name as 'starter' | 'standard' | 'premium',
      newStoreCount,
      currentPlan.billingCycle
    );
  }, [currentPlan, newStoreCount]);

  const currentPricing = useMemo(() => {
    if (!currentPlan || !contractedStores) return null;
    return subscriptionService.calculatePriceForStores(
      currentPlan.name as 'starter' | 'standard' | 'premium',
      contractedStores,
      currentPlan.billingCycle
    );
  }, [currentPlan, contractedStores]);

  const handleStoreCountChange = (value: number) => {
    setNewStoreCount(Math.max(1, Math.min(100, value)));
  };

  const handleUpdateStoreCount = async () => {
    if (!organization?.id || newStoreCount === contractedStores) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      await subscriptionService.updateContractedStores(organization.id, newStoreCount);
      setContractedStores(newStoreCount);
      setShowStoreDialog(false);
      await loadPlanData();
      onUpdate?.();
    } catch (err: any) {
      console.error('店舗数の更新失敗:', err);
      setUpdateError(err.message || '店舗数の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error || !limits || !currentPlan) {
    return (
      <Card className="p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-900 mb-1">
              店舗数管理情報を読み込めませんでした
            </h3>
            {error && (
              <p className="text-xs text-yellow-700 mb-3">{error}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlanData}
              className="text-xs"
            >
              再読み込み
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const cycleUnit = currentPlan.billingCycle === 'monthly' ? '月' : '年';
  const displayPrice = currentPricing
    ? (currentPlan.billingCycle === 'monthly' ? currentPricing.monthlyPrice : currentPricing.annualPrice)
    : 0;
  const newDisplayPrice = pricing
    ? (currentPlan.billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.annualPrice)
    : 0;
  const priceDifference = newDisplayPrice - displayPrice;

  return (
    <>
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" />
            契約店舗数の管理
          </h3>
          <p className="text-sm text-gray-600">
            契約店舗数を変更すると、料金が自動的に再計算されます。
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">現在のプラン</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">
                  {currentPlan.displayName}プラン
                </Badge>
                {currentPricing?.isCampaign && (
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {currentPricing.discountRate}%OFF
                  </Badge>
                )}
              </div>
            </div>

            <div className="border-t border-blue-200 pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">プラン単価</span>
                <span className="font-medium">
                  {currentPricing?.isCampaign && currentPricing.originalPricePerStore && (
                    <span className="text-gray-400 line-through text-xs mr-2">
                      ¥{currentPricing.originalPricePerStore.toLocaleString()}
                    </span>
                  )}
                  ¥{currentPricing?.pricePerStore.toLocaleString()} / {cycleUnit}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">契約店舗数</span>
                <span className="font-medium">{contractedStores}店舗</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                <span className="font-semibold text-gray-800">合計料金</span>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${currentPricing?.isCampaign ? 'text-red-600' : 'text-gray-900'}`}>
                    ¥{displayPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">/ {cycleUnit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">登録済み店舗数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {limits.currentStores}店舗
              </div>
              {limits.currentStores > contractedStores && (
                <div className="text-xs text-amber-600 mt-1">
                  契約店舗数を超えています
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setNewStoreCount(contractedStores);
                setShowStoreDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              店舗数を変更
            </Button>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-2">
                料金計算について
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 料金 = プラン単価 × 契約店舗数</li>
                <li>• 店舗数を増やすと、その分料金が加算されます</li>
                <li>• 契約店舗数は実際の登録店舗数以上を推奨</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {showStoreDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">契約店舗数の変更</h2>
              <button
                onClick={() => setShowStoreDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={updating}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-3">新しい契約店舗数</div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleStoreCountChange(newStoreCount - 1)}
                    disabled={updating || newStoreCount <= 1}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newStoreCount}
                      onChange={(e) => handleStoreCountChange(parseInt(e.target.value) || 1)}
                      className="w-20 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={updating}
                    />
                    <span className="text-lg text-gray-600 ml-2">店舗</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStoreCountChange(newStoreCount + 1)}
                    disabled={updating || newStoreCount >= 100}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {newStoreCount < limits.currentStores && (
                  <div className="text-xs text-amber-600 mt-2">
                    登録済み店舗数（{limits.currentStores}店舗）より少ない契約店舗数です
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-3">
                  <Calculator className="w-4 h-4" />
                  料金計算
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>プラン単価</span>
                    <span className="font-medium">
                      {pricing?.isCampaign && pricing.originalPricePerStore && (
                        <span className="text-gray-400 line-through text-xs mr-2">
                          ¥{pricing.originalPricePerStore.toLocaleString()}
                        </span>
                      )}
                      ¥{pricing?.pricePerStore.toLocaleString()} / {cycleUnit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-gray-700">
                    <span>店舗数</span>
                    <span className="font-medium">× {newStoreCount}店舗</span>
                  </div>

                  <div className="border-t border-green-200 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">新しい合計金額</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">
                          ¥{newDisplayPrice.toLocaleString()}
                          <span className="text-sm font-normal text-gray-600 ml-1">/ {cycleUnit}</span>
                        </div>
                        {priceDifference !== 0 && (
                          <div className={`text-sm ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {priceDifference > 0 ? '+' : ''}¥{priceDifference.toLocaleString()}/{cycleUnit}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {updateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{updateError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowStoreDialog(false)}
                disabled={updating}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpdateStoreCount}
                disabled={updating || newStoreCount === contractedStores}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    更新中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    変更を確定
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
