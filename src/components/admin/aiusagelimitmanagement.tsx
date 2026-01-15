import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { subscriptionService } from '@/services/subscriptionservice'
import { useOrganization } from '@/contexts/organizationcontext'
import { Brain, Save, AlertCircle, TrendingUp, Users, Info } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface UsageSetting {
  role: 'admin' | 'manager' | 'staff'
  monthly_allocation: number
  enabled: boolean
}

interface MonthlyUsageByRole {
  role: string
  total_requests: number
  user_count: number
}

interface PlanInfo {
  planName: string
  planDisplayName: string
  monthlyLimit: number
  currentUsage: number
  remainingUsage: number
  usagePercentage: number
  allowedRoles: Array<'admin' | 'manager' | 'staff'>
}

export const AIUsageLimitManagement: React.FC = () => {
  const { organization } = useOrganization()
  const [settings, setSettings] = useState<UsageSetting[]>([])
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [monthlyUsageByRole, setMonthlyUsageByRole] = useState<MonthlyUsageByRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const loadPlanInfo = async () => {
    if (!organization?.id) return

    try {
      const subscription = await subscriptionService.getCurrentSubscription(organization.id)
      const limits = await subscriptionService.getSubscriptionLimits(organization.id)
      if (!limits || !subscription?.plan) return

      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const { data: aiUsage } = await supabase
        .from('ai_usage_limits')
        .select('current_usage')
        .eq('organization_id', organization.id)
        .gte('month', currentMonth.toISOString())
        .maybeSingle()

      const currentUsage = aiUsage?.current_usage || 0
      const monthlyLimit = limits.aiUsageLimit
      const remainingUsage = Math.max(0, monthlyLimit - currentUsage)
      const usagePercentage = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0

      const planName = subscription.plan.name.toLowerCase()
      let allowedRoles: Array<'admin' | 'manager' | 'staff'> = ['admin']

      if (planName.includes('starter')) {
        allowedRoles = ['admin']
      } else if (planName.includes('standard') || planName.includes('premium') || planName.includes('enterprise')) {
        allowedRoles = ['admin', 'manager', 'staff']
      }

      setPlanInfo({
        planName: subscription.plan.name,
        planDisplayName: subscription.plan.display_name,
        monthlyLimit,
        currentUsage,
        remainingUsage,
        usagePercentage,
        allowedRoles
      })
    } catch (err) {
      console.error('Failed to load plan info:', err)
    }
  }

  const loadSettings = async () => {
    if (!supabase || !organization?.id) return

    try {
      const { data, error } = await supabase
        .from('ai_usage_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .order('role')

      if (error) throw error

      if (data && data.length > 0) {
        setSettings(data.map(d => ({
          role: d.role,
          monthly_allocation: d.monthly_allocation || 0,
          enabled: d.enabled
        })))
      } else {
        setSettings([
          { role: 'admin', monthly_allocation: 150, enabled: true },
          { role: 'manager', monthly_allocation: 100, enabled: true },
          { role: 'staff', monthly_allocation: 50, enabled: true }
        ])
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const loadMonthlyUsageByRole = async () => {
    if (!supabase || !organization?.id) return

    try {
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)
      const monthStr = currentMonth.toISOString().split('T')[0]

      // ai_usage_trackingからorganization_idで直接フィルタ
      const { data: trackingData, error: trackingError } = await supabase
        .from('ai_usage_tracking')
        .select('user_id, request_count')
        .eq('organization_id', organization.id)
        .gte('usage_date', monthStr)

      if (trackingError) throw trackingError

      // ユーザーIDからロール情報を取得
      const userIds = [...new Set(trackingData?.map(t => t.user_id) || [])]
      if (userIds.length === 0) {
        setMonthlyUsageByRole([])
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', userIds)

      if (profilesError) throw profilesError

      const userRoleMap = new Map<string, string>()
      profiles?.forEach(p => {
        userRoleMap.set(p.id, p.role || 'staff')
      })

      const roleMap = new Map<string, { total: number; users: Set<string> }>()

      trackingData?.forEach((item: any) => {
        const role = userRoleMap.get(item.user_id) || 'staff'
        if (!roleMap.has(role)) {
          roleMap.set(role, { total: 0, users: new Set() })
        }
        const roleData = roleMap.get(role)!
        roleData.total += item.request_count || 0
        roleData.users.add(item.user_id)
      })

      const result: MonthlyUsageByRole[] = Array.from(roleMap.entries()).map(([role, data]) => ({
        role,
        total_requests: data.total,
        user_count: data.users.size
      }))

      setMonthlyUsageByRole(result)
    } catch (err) {
      console.error('Failed to load monthly usage by role:', err)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadPlanInfo(), loadSettings(), loadMonthlyUsageByRole()])
      setLoading(false)
    }
    load()
  }, [organization?.id])

  const handleSave = async () => {
    if (!supabase || !organization?.id || !planInfo) return

    const allowedSettings = settings.filter(s => planInfo.allowedRoles.includes(s.role))
    const totalAllocation = allowedSettings
      .reduce((sum, s) => sum + (s.monthly_allocation > 0 ? s.monthly_allocation : 0), 0)

    if (totalAllocation > planInfo.monthlyLimit) {
      setMessage({
        type: 'error',
        text: `配分合計（${totalAllocation}回）がプラン上限（${planInfo.monthlyLimit}回）を超えています`
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      for (const setting of allowedSettings) {
        const { error } = await supabase
          .from('ai_usage_settings')
          .upsert({
            organization_id: organization.id,
            role: setting.role,
            monthly_allocation: setting.monthly_allocation,
            enabled: setting.enabled,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'organization_id,role'
          })

        if (error) {
          console.error('Failed to upsert setting:', {
            role: setting.role,
            error: error
          })
          throw error
        }
      }

      setMessage({ type: 'success', text: '設定を保存しました' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      const errorMessage = err?.message || '設定の保存に失敗しました'
      setMessage({
        type: 'error',
        text: `設定の保存に失敗しました: ${errorMessage}`
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (role: string, field: 'monthly_allocation' | 'enabled', value: number | boolean) => {
    setSettings(prev =>
      prev.map(s => (s.role === role ? { ...s, [field]: value } : s))
    )
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者'
      case 'manager':
        return '店長'
      case 'staff':
        return 'スタッフ'
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'manager':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'staff':
        return 'bg-green-100 text-green-700 border-green-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 80) return 'text-orange-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600'
    if (percentage >= 80) return 'bg-orange-600'
    return 'bg-blue-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Brain className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  const filteredSettings = planInfo
    ? settings.filter(s => planInfo.allowedRoles.includes(s.role))
    : settings

  const totalAllocated = filteredSettings
    .reduce((sum, s) => sum + (s.monthly_allocation > 0 ? s.monthly_allocation : 0), 0)

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : message.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {planInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              プラン利用状況（今月）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium mb-1">プラン / 月間上限</div>
                <div className="text-lg font-bold text-blue-900 mb-1">{planInfo.planDisplayName}</div>
                <div className="text-2xl font-bold text-blue-900">{planInfo.monthlyLimit.toLocaleString()}回</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium mb-1">使用済み</div>
                <div className="text-2xl font-bold text-green-900">{planInfo.currentUsage.toLocaleString()}回</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-600 font-medium mb-1">残り</div>
                <div className="text-2xl font-bold text-orange-900">{planInfo.remainingUsage.toLocaleString()}回</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">使用率</span>
                <span className={`font-bold ${getUsageColor(planInfo.usagePercentage)}`}>
                  {planInfo.usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(planInfo.usagePercentage)}`}
                  style={{ width: `${Math.min(100, planInfo.usagePercentage)}%` }}
                />
              </div>
            </div>

            {planInfo.usagePercentage >= 80 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <strong>注意:</strong> 月間上限の{planInfo.usagePercentage >= 90 ? '90' : '80'}%に達しています。
                    プランのアップグレードをご検討ください。
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            ロール別AI使用枠の配分設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">配分の仕組み</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>プランの月間上限内で、各ロールに使用枠を配分できます</li>
                  <li>各ロールの配分は「1人あたりの月間上限回数」です</li>
                  {planInfo && planInfo.allowedRoles.length === 1 ? (
                    <li>スタータープランでは管理者のみがシステムを利用できます</li>
                  ) : (
                    <li>スタンダードプラン以上では管理者、店長、スタッフが利用できます</li>
                  )}
                  <li>配分合計がプラン上限を超えないように調整してください</li>
                </ul>
              </div>
            </div>
          </div>

          {filteredSettings.map(setting => (
            <div key={setting.role} className="p-4 border rounded-lg space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(setting.role)}>
                    {getRoleLabel(setting.role)}
                  </Badge>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    onChange={e => updateSetting(setting.role, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>制限を有効化</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium min-w-[140px]">1人あたり月間枠:</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min="1"
                    max={planInfo?.monthlyLimit || 1000}
                    value={setting.monthly_allocation}
                    onChange={e =>
                      updateSetting(setting.role, 'monthly_allocation', parseInt(e.target.value) || 1)
                    }
                    className="px-3 py-2 border rounded-md w-32"
                  />
                  <span className="text-sm text-muted-foreground">回 / 月 / 人</span>
                </div>
              </div>

              {monthlyUsageByRole.find(u => u.role === setting.role) && (
                <div className="pt-2 border-t text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      今月の使用状況: {monthlyUsageByRole.find(u => u.role === setting.role)?.total_requests || 0}回
                      （{monthlyUsageByRole.find(u => u.role === setting.role)?.user_count || 0}人）
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">配分合計（全ロール）:</span>
                <span className={totalAllocated > (planInfo?.monthlyLimit || 0) ? 'text-red-600 font-bold' : 'font-semibold'}>
                  {totalAllocated.toLocaleString()}回
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">プラン上限:</span>
                <span className="font-semibold">{planInfo?.monthlyLimit.toLocaleString() || 0}回</span>
              </div>
              {planInfo && totalAllocated <= planInfo.monthlyLimit && (
                <div className="flex justify-between text-green-600">
                  <span className="font-medium">配分可能残り:</span>
                  <span className="font-semibold">{(planInfo.monthlyLimit - totalAllocated).toLocaleString()}回</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
