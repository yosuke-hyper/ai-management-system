import { Card } from '../ui/card';
import { usePerformanceMetrics } from '../../hooks/useperformancemetrics';
import { Activity, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceMetricsProps {
  hours?: number;
}

export function PerformanceMetrics({ hours = 24 }: PerformanceMetricsProps) {
  const { trends, loading, error } = usePerformanceMetrics({ hours });

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>パフォーマンスデータの読み込みに失敗しました</span>
        </div>
      </Card>
    );
  }

  const avgResponseTime = trends.length > 0
    ? trends.reduce((sum, t) => sum + t.avgResponseTime, 0) / trends.length
    : 0;

  const totalRequests = trends.reduce((sum, t) => sum + t.requestCount, 0);

  const avgErrorRate = trends.length > 0
    ? trends.reduce((sum, t) => sum + t.errorRate, 0) / trends.length
    : 0;

  const chartData = {
    labels: trends.map(t => new Date(t.timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })),
    datasets: [
      {
        label: '平均応答時間 (ms)',
        data: trends.map(t => t.avgResponseTime),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'ミリ秒',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">平均応答時間</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgResponseTime.toFixed(0)}ms
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">総リクエスト数</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              avgErrorRate > 5 ? 'bg-red-100' : 'bg-green-100'
            }`}>
              <TrendingUp className={`h-5 w-5 ${
                avgErrorRate > 5 ? 'text-red-600' : 'text-green-600'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">エラー率</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgErrorRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          応答時間の推移（過去{hours}時間）
        </h3>
        <div className="h-64">
          {trends.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              データがありません
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
