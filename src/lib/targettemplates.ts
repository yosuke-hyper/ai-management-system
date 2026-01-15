export interface TargetTemplate {
  name: string;
  description: string;
  targetProfitMargin: number;
  targetCostRate: number;
  targetLaborRate: number;
  recommendedFor: string;
}

export interface BusinessCategoryTemplate {
  categoryId: string;
  categoryName: string;
  targetProfitMargin: number;
  targetCostRate: number;
  targetLaborRate: number;
  description: string;
}

export interface ManagementTypeTemplate {
  id: string;
  name: string;
  description: string;
  icon: 'trophy' | 'scale' | 'zap';
  color: 'green' | 'blue' | 'orange';
  baseTemplate: TargetTemplate;
  businessCategories: BusinessCategoryTemplate[];
}

export const managementTypes: ManagementTypeTemplate[] = [
  {
    id: 'high-profit',
    name: '高利益型',
    description: '利益率を重視した高付加価値経営。高品質な商品・サービスで単価を上げ、コストを抑えた経営スタイル。',
    icon: 'trophy',
    color: 'green',
    baseTemplate: {
      name: '高利益型（一般）',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 18,
      targetCostRate: 30,
      targetLaborRate: 25,
      recommendedFor: '高付加価値・こだわり店舗向け'
    },
    businessCategories: [
      {
        categoryId: 'izakaya',
        categoryName: '居酒屋',
        targetProfitMargin: 18,
        targetCostRate: 30,
        targetLaborRate: 25,
        description: '高級居酒屋・こだわりの個店向け'
      },
      {
        categoryId: 'cafe',
        categoryName: 'カフェ',
        targetProfitMargin: 22,
        targetCostRate: 28,
        targetLaborRate: 23,
        description: 'スペシャルティコーヒー・高級カフェ向け'
      },
      {
        categoryId: 'ramen',
        categoryName: 'ラーメン',
        targetProfitMargin: 20,
        targetCostRate: 30,
        targetLaborRate: 24,
        description: '高級ラーメン・こだわり店向け'
      },
      {
        categoryId: 'restaurant',
        categoryName: 'レストラン',
        targetProfitMargin: 20,
        targetCostRate: 30,
        targetLaborRate: 24,
        description: '高級レストラン・フレンチイタリアン向け'
      }
    ]
  },
  {
    id: 'balanced',
    name: 'バランス型',
    description: '業界標準のバランス経営。売上・コスト・利益のバランスを重視した安定経営スタイル。',
    icon: 'scale',
    color: 'blue',
    baseTemplate: {
      name: 'バランス型（一般）',
      description: '業界標準のバランス経営',
      targetProfitMargin: 15,
      targetCostRate: 33,
      targetLaborRate: 27,
      recommendedFor: '一般的な飲食店経営向け'
    },
    businessCategories: [
      {
        categoryId: 'izakaya',
        categoryName: '居酒屋',
        targetProfitMargin: 14,
        targetCostRate: 33,
        targetLaborRate: 28,
        description: '一般的な居酒屋経営向け'
      },
      {
        categoryId: 'cafe',
        categoryName: 'カフェ',
        targetProfitMargin: 17,
        targetCostRate: 32,
        targetLaborRate: 26,
        description: '一般的なカフェ経営向け'
      },
      {
        categoryId: 'ramen',
        categoryName: 'ラーメン',
        targetProfitMargin: 16,
        targetCostRate: 33,
        targetLaborRate: 27,
        description: '一般的なラーメン店経営向け'
      },
      {
        categoryId: 'restaurant',
        categoryName: 'レストラン',
        targetProfitMargin: 15,
        targetCostRate: 33,
        targetLaborRate: 27,
        description: '一般的なレストラン経営向け'
      }
    ]
  },
  {
    id: 'high-turnover',
    name: '回転効率型',
    description: '客数・回転率を重視した薄利多売経営。低価格で集客し、回転数で利益を確保するスタイル。',
    icon: 'zap',
    color: 'orange',
    baseTemplate: {
      name: '回転効率型（一般）',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 12,
      targetCostRate: 36,
      targetLaborRate: 29,
      recommendedFor: '大衆向け・チェーン店向け'
    },
    businessCategories: [
      {
        categoryId: 'izakaya',
        categoryName: '居酒屋',
        targetProfitMargin: 11,
        targetCostRate: 36,
        targetLaborRate: 30,
        description: '大衆居酒屋・チェーン店向け'
      },
      {
        categoryId: 'cafe',
        categoryName: 'カフェ',
        targetProfitMargin: 13,
        targetCostRate: 36,
        targetLaborRate: 28,
        description: 'セルフサービス・チェーンカフェ向け'
      },
      {
        categoryId: 'ramen',
        categoryName: 'ラーメン',
        targetProfitMargin: 13,
        targetCostRate: 36,
        targetLaborRate: 29,
        description: '大衆ラーメン・チェーン店向け'
      },
      {
        categoryId: 'restaurant',
        categoryName: 'レストラン',
        targetProfitMargin: 12,
        targetCostRate: 36,
        targetLaborRate: 29,
        description: 'ファミリーレストラン・カジュアル向け'
      }
    ]
  }
];

export interface BrandTemplates {
  [key: string]: TargetTemplate[];
}

export const targetTemplates: BrandTemplates = {
  izakaya: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 18,
      targetCostRate: 30,
      targetLaborRate: 25,
      recommendedFor: '高級居酒屋・こだわりの個店向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 14,
      targetCostRate: 33,
      targetLaborRate: 28,
      recommendedFor: '一般的な居酒屋経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 11,
      targetCostRate: 36,
      targetLaborRate: 30,
      recommendedFor: '大衆居酒屋・チェーン店向け'
    }
  ],
  cafe: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 22,
      targetCostRate: 28,
      targetLaborRate: 23,
      recommendedFor: 'スペシャルティコーヒー・高級カフェ向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 17,
      targetCostRate: 32,
      targetLaborRate: 26,
      recommendedFor: '一般的なカフェ経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 13,
      targetCostRate: 36,
      targetLaborRate: 28,
      recommendedFor: 'セルフサービス・チェーンカフェ向け'
    }
  ],
  ramen: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 20,
      targetCostRate: 30,
      targetLaborRate: 24,
      recommendedFor: '高級ラーメン・こだわり店向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 16,
      targetCostRate: 33,
      targetLaborRate: 27,
      recommendedFor: '一般的なラーメン店経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 13,
      targetCostRate: 36,
      targetLaborRate: 29,
      recommendedFor: '大衆ラーメン・チェーン店向け'
    }
  ],
  bar: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 25,
      targetCostRate: 25,
      targetLaborRate: 22,
      recommendedFor: 'オーセンティックバー・高級バー向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 20,
      targetCostRate: 28,
      targetLaborRate: 25,
      recommendedFor: '一般的なバー経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 15,
      targetCostRate: 32,
      targetLaborRate: 28,
      recommendedFor: 'カジュアルバー・立ち飲み向け'
    }
  ],
  fastfood: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 15,
      targetCostRate: 32,
      targetLaborRate: 26,
      recommendedFor: 'プレミアム路線・グルメバーガー向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 12,
      targetCostRate: 35,
      targetLaborRate: 28,
      recommendedFor: '一般的なファストフード経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 9,
      targetCostRate: 38,
      targetLaborRate: 30,
      recommendedFor: 'ボリューム重視・低価格路線向け'
    }
  ],
  bakery: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 23,
      targetCostRate: 28,
      targetLaborRate: 22,
      recommendedFor: '高級ベーカリー・職人系向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 18,
      targetCostRate: 32,
      targetLaborRate: 25,
      recommendedFor: '一般的なベーカリー経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 14,
      targetCostRate: 35,
      targetLaborRate: 27,
      recommendedFor: 'チェーンベーカリー・量産型向け'
    }
  ],
  restaurant: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 20,
      targetCostRate: 30,
      targetLaborRate: 24,
      recommendedFor: '高級レストラン・フレンチイタリアン向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 15,
      targetCostRate: 33,
      targetLaborRate: 27,
      recommendedFor: '一般的なレストラン経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 12,
      targetCostRate: 36,
      targetLaborRate: 29,
      recommendedFor: 'ファミリーレストラン・カジュアル向け'
    }
  ],
  other: [
    {
      name: '高利益型',
      description: '利益率を重視した高付加価値経営',
      targetProfitMargin: 18,
      targetCostRate: 30,
      targetLaborRate: 25,
      recommendedFor: '高付加価値業態向け'
    },
    {
      name: 'バランス型',
      description: '業界標準のバランス経営',
      targetProfitMargin: 15,
      targetCostRate: 33,
      targetLaborRate: 27,
      recommendedFor: '一般的な飲食業経営向け'
    },
    {
      name: '回転効率型',
      description: '客数・回転率を重視した薄利多売',
      targetProfitMargin: 12,
      targetCostRate: 36,
      targetLaborRate: 29,
      recommendedFor: '大衆向け業態向け'
    }
  ]
};

export const brandTypeLabels: Record<string, string> = {
  restaurant: 'レストラン',
  izakaya: '居酒屋',
  cafe: 'カフェ',
  ramen: 'ラーメン',
  bar: 'バー',
  fastfood: 'ファストフード',
  bakery: 'ベーカリー',
  other: 'その他'
};

export function getTemplatesForBrand(brandType: string | undefined): TargetTemplate[] {
  if (!brandType || !targetTemplates[brandType]) {
    return targetTemplates.other;
  }
  return targetTemplates[brandType];
}

export function getBrandLabel(brandType: string | undefined): string {
  if (!brandType) return 'その他';
  return brandTypeLabels[brandType] || 'その他';
}

export function getManagementTypeById(id: string): ManagementTypeTemplate | undefined {
  return managementTypes.find(t => t.id === id);
}

export function convertToTargetTemplate(
  managementType: ManagementTypeTemplate,
  categoryId?: string
): TargetTemplate {
  if (categoryId) {
    const category = managementType.businessCategories.find(c => c.categoryId === categoryId);
    if (category) {
      return {
        name: `${managementType.name}（${category.categoryName}）`,
        description: category.description,
        targetProfitMargin: category.targetProfitMargin,
        targetCostRate: category.targetCostRate,
        targetLaborRate: category.targetLaborRate,
        recommendedFor: category.description
      };
    }
  }
  return managementType.baseTemplate;
}
