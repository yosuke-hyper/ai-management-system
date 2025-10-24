import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building, Users, CreditCard, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrganization,
  updateOrganization,
  getCurrentUserOrganizationId
} from '@/services/organizationService'
import { OrganizationMembers } from '@/components/Organization/OrganizationMembers'
import { SubscriptionInfo } from '@/components/Organization/SubscriptionInfo'
import { UsageOverview } from '@/components/Usage/UsageOverview'

interface Organization {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  subscription_status: string
  subscription_plan: string
  trial_ends_at?: string
  max_stores: number
  max_users: number
  max_ai_requests_per_month: number
  created_at?: string
  updated_at?: string
}

export const OrganizationSettings: React.FC = () => {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'subscription'>('general')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (user?.id) {
      loadOrganization()
    }
  }, [user?.id])

  const loadOrganization = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const organizationId = await getCurrentUserOrganizationId(user.id)
      if (!organizationId) {
        setError('組織が見つかりません')
        return
      }

      const { data, error: fetchError } = await getOrganization(organizationId)
      if (fetchError) {
        setError('組織情報の取得に失敗しました')
        return
      }

      if (data) {
        setOrganization(data)
        setFormData({
          name: data.name,
          email: data.email,
          phone: data.phone || ''
        })
      }
    } catch (err) {
      setError('組織情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (!organization) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const { data, error: updateError } = await updateOrganization(organization.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      })

      if (updateError) {
        setError('組織情報の更新に失敗しました')
        return
      }

      if (data) {
        setOrganization(data)
        setSuccess('組織情報を更新しました')
      }
    } catch (err) {
      setError('組織情報の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-slate-700">組織情報が見つかりません</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">組織設定</h1>
          <p className="text-slate-600">組織の情報やメンバーを管理します</p>
        </div>

        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'general'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              基本情報
              {activeTab === 'general' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'members'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              メンバー管理
              {activeTab === 'members' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'subscription'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              サブスクリプション
              {activeTab === 'subscription' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  組織名
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="株式会社〇〇"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  組織スラッグ
                </label>
                <input
                  type="text"
                  value={organization.slug}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  組織の一意な識別子です（変更不可）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  電話番号（任意）
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="03-1234-5678"
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      変更を保存
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'members' && (
          <OrganizationMembers organizationId={organization.id} />
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <UsageOverview />
            <SubscriptionInfo organization={organization} onUpdate={loadOrganization} />
          </div>
        )}
      </div>
    </div>
  )
}
