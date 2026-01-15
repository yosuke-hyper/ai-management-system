import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Shield, Mail } from 'lucide-react'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">FoodValue for 経営分析</h3>
            <p className="text-sm text-slate-400">
              飲食店の経営を支援する総合的な分析ツール
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">法的情報</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  利用規約
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">お問い合わせ</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                <a
                  href="mailto:support@izakaya-ikki.example.com"
                  className="hover:text-white transition-colors"
                >
                  support@izakaya-ikki.example.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 text-center">
          <p className="text-sm text-slate-400">
            &copy; {currentYear} FoodValue for 経営分析. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
