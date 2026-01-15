import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  LayoutDashboard,
  Settings,
  Database,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { helpFAQs, FAQItem } from '@/lib/helpfaq';

type CategoryType = FAQItem['category'] | 'all';

const categoryConfig: Record<CategoryType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  all: { label: 'すべて', icon: HelpCircle, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  basic: { label: '基本操作', icon: Sparkles, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  reports: { label: '日報・レポート', icon: FileText, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  dashboard: { label: 'ダッシュボード', icon: LayoutDashboard, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  settings: { label: '設定・管理', icon: Settings, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  data: { label: 'データ管理', icon: Database, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
};

function FAQAccordion({ faq, isOpen, onToggle }: { faq: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const config = categoryConfig[faq.category];
  const Icon = config.icon;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-1.5 rounded-md ${config.color.split(' ').slice(0, 2).join(' ')}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-gray-900">{faq.question}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="pl-10 text-gray-600 leading-relaxed whitespace-pre-wrap">
            {faq.answer}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const filteredFAQs = useMemo(() => {
    return helpFAQs.filter(faq => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setOpenItems(new Set(filteredFAQs.map(f => f.id)));
  };

  const collapseAll = () => {
    setOpenItems(new Set());
  };

  const categories: CategoryType[] = ['all', 'basic', 'reports', 'dashboard', 'settings', 'data'];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <HelpCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">よくある質問</h1>
            <p className="text-gray-600">お探しの回答が見つからない場合はサポートへお問い合わせください</p>
          </div>
        </div>
        <Link to="/dashboard/support">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            サポートページ
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="質問を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => {
          const config = categoryConfig[cat];
          const Icon = config.icon;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? config.color.replace('hover:', '')
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {filteredFAQs.length}件の質問
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              すべて開く
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              すべて閉じる
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">該当する質問が見つかりませんでした</p>
              <p className="text-sm text-gray-400 mt-1">検索キーワードやカテゴリを変更してみてください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map(faq => (
                <FAQAccordion
                  key={faq.id}
                  faq={faq}
                  isOpen={openItems.has(faq.id)}
                  onToggle={() => toggleItem(faq.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">お探しの回答が見つかりませんか?</h3>
              <p className="text-sm text-gray-600">サポートチームがお手伝いいたします</p>
            </div>
            <Link to="/dashboard/support">
              <Button>
                お問い合わせ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
