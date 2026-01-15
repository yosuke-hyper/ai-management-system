import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { X, Send, CheckCircle, Store, User, Mail, Phone, MessageSquare } from 'lucide-react';

interface QuoteRequestFormProps {
  onClose: () => void;
}

export function QuoteRequestForm({ onClose }: QuoteRequestFormProps) {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    storeCount: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.organizationName.trim() || !formData.contactName.trim() ||
        !formData.email.trim() || !formData.storeCount.trim()) {
      setError('必須項目を入力してください');
      return;
    }

    const storeCountNum = parseInt(formData.storeCount);
    if (isNaN(storeCountNum) || storeCountNum < 5) {
      setError('店舗数は5以上を入力してください');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const subject = `【見積依頼】${formData.storeCount}店舗の導入検討について`;
      const body = `
組織名: ${formData.organizationName}
担当者名: ${formData.contactName}
メールアドレス: ${formData.email}
電話番号: ${formData.phone || '（未入力）'}
利用予定店舗数: ${formData.storeCount}店舗

お問い合わせ内容:
${formData.message || '（未入力）'}

---
この見積依頼は FoodValue for 経営分析から自動送信されました。
      `.trim();

      window.location.href = `mailto:y.sato@food-value-solution.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError('送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">送信完了</h2>
          <p className="text-gray-600 mb-4">
            見積依頼を受け付けました。メールクライアントが開きますので、そのまま送信してください。
          </p>
          <p className="text-sm text-gray-500">
            担当者から2営業日以内にご連絡いたします。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">見積依頼フォーム</h2>
            <p className="text-sm text-gray-600 mt-1">5店舗以上の導入をご検討の方</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              5店舗以上をご利用の場合、ボリュームディスカウントなど最適なプランをご提案いたします。
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Store className="w-4 h-4" />
              組織名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.organizationName}
              onChange={(e) => handleInputChange('organizationName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="株式会社〇〇"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              担当者名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="山田 太郎"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@company.com"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4" />
              電話番号（任意）
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="03-1234-5678"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Store className="w-4 h-4" />
              利用予定店舗数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="5"
              value={formData.storeCount}
              onChange={(e) => handleInputChange('storeCount', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="5"
            />
            <p className="text-xs text-gray-500 mt-1">5店舗以上を入力してください</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              お問い合わせ内容（任意）
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="ご質問やご要望がございましたらご記入ください"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  見積依頼を送信
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
