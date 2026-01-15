import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Trophy, Scale, Zap, ChevronRight, ArrowLeft, Store } from 'lucide-react';
import {
  managementTypes,
  convertToTargetTemplate,
  type TargetTemplate,
  type ManagementTypeTemplate,
  type BusinessCategoryTemplate
} from '@/lib/targettemplates';

interface TemplateSelectorProps {
  brandType?: string;
  onSelect: (template: TargetTemplate) => void;
  onClose: () => void;
}

const iconMap = {
  trophy: Trophy,
  scale: Scale,
  zap: Zap
};

const colorMap = {
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    hoverBorder: 'hover:border-green-500 dark:hover:border-green-400',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    hoverBorder: 'hover:border-orange-500 dark:hover:border-orange-400',
    iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  }
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  onClose
}) => {
  const [selectedType, setSelectedType] = useState<ManagementTypeTemplate | null>(null);
  const [step, setStep] = useState<'type' | 'category'>('type');

  const handleTypeSelect = (type: ManagementTypeTemplate) => {
    setSelectedType(type);
    setStep('category');
  };

  const handleCategorySelect = (categoryId?: string) => {
    if (selectedType) {
      const template = convertToTargetTemplate(selectedType, categoryId);
      onSelect(template);
    }
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 'category' && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mr-2"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {step === 'type' ? '経営スタイルを選択' : `${selectedType?.name} - 業種を選択`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step === 'type'
                    ? 'お店の経営方針に合ったスタイルを選んでください'
                    : '業種を選ぶとより最適な数値が設定されます（任意）'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'type' ? (
            <>
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>ヒント：</strong>経営スタイルを選んだ後、業種を選択するとより最適な数値が設定されます。
                  テンプレート適用後も数値は手動で調整できます。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {managementTypes.map((type) => {
                  const Icon = iconMap[type.icon];
                  const colors = colorMap[type.color];

                  return (
                    <div
                      key={type.id}
                      className={`group relative border-2 ${colors.border} ${colors.hoverBorder} rounded-xl p-6 transition-all cursor-pointer hover:shadow-xl ${colors.bg}`}
                      onClick={() => handleTypeSelect(type)}
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className={`w-6 h-6 ${colors.text}`} />
                      </div>

                      <div className="mb-4">
                        <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {type.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {type.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">目標営業利益率</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {type.baseTemplate.targetProfitMargin}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">目標原価率</span>
                          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {type.baseTemplate.targetCostRate}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">目標人件費率</span>
                          <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                            {type.baseTemplate.targetLaborRate}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTypeSelect(type);
                          }}
                          className={`w-full py-2 ${colors.iconBg} text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2`}
                        >
                          このスタイルを選択
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">各スタイルの特徴</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>高利益型：</strong>高付加価値商品・サービスで利益率を重視。こだわりの個店や高級店向け。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Scale className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>バランス型：</strong>売上・コスト・利益のバランスを重視した安定経営。一般的な飲食店向け。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><strong>回転効率型：</strong>客数・回転率を重視した薄利多売。大衆店やチェーン店向け。</span>
                  </li>
                </ul>
              </div>
            </>
          ) : selectedType && (
            <>
              <div className="mb-6">
                <div className={`p-4 ${colorMap[selectedType.color].bg} rounded-lg border ${colorMap[selectedType.color].border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {React.createElement(iconMap[selectedType.icon], {
                      className: `w-5 h-5 ${colorMap[selectedType.color].text}`
                    })}
                    <span className={`font-semibold ${colorMap[selectedType.color].text}`}>
                      {selectedType.name}を選択中
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    業種を選択すると、その業種に最適化された数値が適用されます。
                    業種に関係なく一般的な数値を使う場合は「一般（業種を指定しない）」を選択してください。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <CategoryCard
                  title="一般（業種を指定しない）"
                  description={selectedType.baseTemplate.recommendedFor}
                  profitMargin={selectedType.baseTemplate.targetProfitMargin}
                  costRate={selectedType.baseTemplate.targetCostRate}
                  laborRate={selectedType.baseTemplate.targetLaborRate}
                  color={selectedType.color}
                  isGeneral
                  onSelect={() => handleCategorySelect()}
                />

                {selectedType.businessCategories.map((category) => (
                  <CategoryCard
                    key={category.categoryId}
                    title={category.categoryName}
                    description={category.description}
                    profitMargin={category.targetProfitMargin}
                    costRate={category.targetCostRate}
                    laborRate={category.targetLaborRate}
                    color={selectedType.color}
                    onSelect={() => handleCategorySelect(category.categoryId)}
                  />
                ))}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">業種別の数値について</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  各業種の数値は業界の一般的な傾向を基に設定されています。
                  カフェは原価率が低め、居酒屋は人件費率が高めなど、業種ごとの特性を反映しています。
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          {step === 'category' && (
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

interface CategoryCardProps {
  title: string;
  description: string;
  profitMargin: number;
  costRate: number;
  laborRate: number;
  color: 'green' | 'blue' | 'orange';
  isGeneral?: boolean;
  onSelect: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  profitMargin,
  costRate,
  laborRate,
  color,
  isGeneral,
  onSelect
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={`group relative border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer hover:shadow-lg ${isGeneral ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}`}
      onClick={onSelect}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          {isGeneral ? (
            <div className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <Store className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
          ) : (
            <div className={`p-1.5 ${colors.badge} rounded-lg`}>
              <Store className="w-4 h-4" />
            </div>
          )}
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">利益率</span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">{profitMargin}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">原価率</span>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{costRate}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">人件費率</span>
          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{laborRate}%</span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
      >
        この設定を適用
      </button>
    </div>
  );
};
