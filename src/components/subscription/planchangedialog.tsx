import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, AlertCircle, Store, Plus, Minus, Calculator, Sparkles } from 'lucide-react';
import { subscriptionService } from '@/services/subscriptionservice';

interface PlanChangeDialogProps {
  currentPlanName?: string;
  currentBillingCycle?: string;
  currentContractedStores?: number;
  newPlanName: string;
  newPlanDisplay: string;
  newPlanPrice: number;
  newBillingCycle: 'monthly' | 'annual';
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanChangeDialog({
  currentPlanName,
  currentBillingCycle,
  currentContractedStores,
  newPlanName,
  newPlanDisplay,
  newPlanPrice,
  newBillingCycle,
  organizationId,
  onClose,
  onSuccess
}: PlanChangeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractedStores, setContractedStores] = useState<number>(currentContractedStores || 1);

  useEffect(() => {
    if (currentContractedStores) {
      setContractedStores(currentContractedStores);
    }
  }, [currentContractedStores]);

  const billingCycleLabel = newBillingCycle === 'monthly' ? '月払い' : '年払い';
  const cycleUnit = newBillingCycle === 'monthly' ? '月' : '年';

  const pricing = useMemo(() => {
    return subscriptionService.calculatePriceForStores(
      newPlanName as 'starter' | 'standard' | 'premium',
      contractedStores,
      newBillingCycle
    );
  }, [newPlanName, contractedStores, newBillingCycle]);

  const recommendedStores = useMemo(() => {
    switch (newPlanName) {
      case 'starter': return { min: 1, max: 1, text: '1店舗' };
      case 'standard': return { min: 1, max: 5, text: '1〜5店舗' };
      case 'premium': return { min: 1, max: 20, text: '1〜20店舗' };
      default: return { min: 1, max: 100, text: '1〜100店舗' };
    }
  }, [newPlanName]);

  const displayPrice = newBillingCycle === 'monthly' ? pricing.monthlyPrice : pricing.annualPrice;
  const monthlyEquivalent = newBillingCycle === 'annual' ? Math.round(pricing.annualPrice / 12) : null;

  const handleStoreChange = (value: number) => {
    const newValue = Math.max(1, Math.min(100, value));
    setContractedStores(newValue);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    if (contractedStores < 1) {
      setError('契約店舗数は1以上を指定してください');
      setLoading(false);
      return;
    }

    if (contractedStores > 100) {
      setError('契約店舗数は100以下を指定してください。それ以上の店舗数が必要な場合はお問い合わせください');
      setLoading(false);
      return;
    }

    try {
      await subscriptionService.changePlan(
        organizationId,
        newPlanName as 'starter' | 'standard' | 'premium',
        newBillingCycle,
        contractedStores
      );
      onSuccess();
    } catch (err: any) {
      console.error('プラン変更エラー:', err);
      setError(err.message || 'プラン変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">プラン変更の確認</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {currentPlanName && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">現在のプラン</div>
              <div className="font-medium text-gray-900">
                {currentPlanName === 'starter' && 'Starter'}
                {currentPlanName === 'standard' && 'Standard'}
                {currentPlanName === 'premium' && 'Premium'}
                プラン（{currentBillingCycle === 'monthly' ? '月払い' : '年払い'}）
                {currentContractedStores && ` × ${currentContractedStores}店舗`}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center py-2">
            <div className="text-2xl text-gray-400">↓</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-1">
              <Sparkles className="w-4 h-4" />
              新しいプラン
            </div>
            <div className="font-bold text-xl text-gray-900 mb-2">
              {newPlanDisplay}プラン（{billingCycleLabel}）
            </div>
            <div className="text-sm text-gray-600">
              推奨店舗数: {recommendedStores.text}
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                契約店舗数を選択
              </div>
            </label>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => handleStoreChange(contractedStores - 1)}
                disabled={loading || contractedStores <= 1}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Minus className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={contractedStores}
                  onChange={(e) => handleStoreChange(parseInt(e.target.value) || 1)}
                  className="w-20 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <span className="text-lg text-gray-600 ml-2">店舗</span>
              </div>

              <button
                type="button"
                onClick={() => handleStoreChange(contractedStores + 1)}
                disabled={loading || contractedStores >= 100}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {contractedStores > recommendedStores.max && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-3">
                推奨店舗数を超えています。上位プランをご検討ください。
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-3">
              <Calculator className="w-4 h-4" />
              料金計算
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-700">
                <span>プラン単価</span>
                <span className="font-medium">
                  {pricing.isCampaign && pricing.originalPricePerStore && (
                    <span className="text-gray-400 line-through text-sm mr-2">
                      ¥{pricing.originalPricePerStore.toLocaleString()}
                    </span>
                  )}
                  ¥{pricing.pricePerStore.toLocaleString()} / {cycleUnit}
                  {pricing.isCampaign && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {pricing.discountRate}%OFF
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-700">
                <span>店舗数</span>
                <span className="font-medium">× {contractedStores}店舗</span>
              </div>

              <div className="border-t border-green-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">合計金額</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-700">
                      ¥{displayPrice.toLocaleString()}
                      <span className="text-sm font-normal text-gray-600 ml-1">/ {cycleUnit}</span>
                    </div>
                    {monthlyEquivalent && (
                      <div className="text-xs text-gray-500">
                        月額換算: ¥{monthlyEquivalent.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">プラン変更について</p>
                <ul className="space-y-1 text-xs">
                  <li>• 変更は即座に適用されます</li>
                  <li>• 次回更新日から新しい料金が適用されます</li>
                  <li>• プランの機能はすぐにご利用いただけます</li>
                  <li>• 店舗数は後から追加・変更可能です</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                変更中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                プランを変更（¥{displayPrice.toLocaleString()}/{cycleUnit}）
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
