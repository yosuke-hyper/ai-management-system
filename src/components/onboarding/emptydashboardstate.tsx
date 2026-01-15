import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface EmptyDashboardStateProps {
  title?: string;
  description?: string;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  title = 'データがまだありません',
  description = 'データを入力すると、ここに売上・利益のグラフが表示されます',
}) => {
  const navigate = useNavigate();

  const features = [
    {
      icon: TrendingUp,
      title: '売上トレンド',
      description: '日別・週別・月別の売上推移',
    },
    {
      icon: PieChart,
      title: '原価・人件費分析',
      description: 'コスト構成を可視化',
    },
    {
      icon: BarChart3,
      title: '利益率の把握',
      description: '営業利益を自動計算',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200 p-8 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="w-10 h-10 text-blue-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">{description}</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-100"
              >
                <Icon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/dashboard/report')}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
        >
          <FileText className="w-6 h-6" />
          今日の日報を入力する
          <ArrowRight className="w-6 h-6" />
        </button>

        <p className="mt-4 text-sm text-gray-500">
          1日分のデータを入力すると、ダッシュボードが表示されます
        </p>
      </div>
    </div>
  );
};
