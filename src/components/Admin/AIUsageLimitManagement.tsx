import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { Brain, Save, RotateCcw, AlertCircle } from 'lucide-react'

interface UsageSetting {
  role: 'admin' | 'manager' | 'staff'
  daily_limit: number
  enabled: boolean
}

interface UsageTracking {
  user_id: string
  user_name: string
  user_role: string
  usage_date: string
  request_count: number
}

export const AIUsageLimitManagement: React.FC = () => {
  const [settings, setSettings] = useState<UsageSetting[]>([])
  const [usageData, setUsageData] = useState<UsageTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadSettings = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('ai_usage_settings')
        .select('*')
        .order('role')

      if (error) throw error

      setSettings(data || [])
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const loadUsageData = async () => {
    if (!supabase) return

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('ai_usage_tracking')
        .select(`
          user_id,
          usage_date,
          request_count,
          profiles!inner(name, role)
        `)
        .eq('usage_date', today)
        .order('request_count', { ascending: false })

      if (error) throw error

      const formatted = (data || []).map((item: any) => ({
        user_id: item.user_id,
        user_name: item.profiles?.name || '不明',
        user_role: item.profiles?.role || 'staff',
        usage_date: item.usage_date,
        request_count: item.request_count
      }))

      setUsageData(formatted)
    } catch (err) {
      console.error('Failed to load usage data:', err)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadSettings(), loadUsageData()])
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!supabase) return

    setSaving(true)
    setMessage(null)

    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('ai_usage_settings')
          .update({
            daily_limit: setting.daily_limit,
            enabled: setting.enabled
          })
          .eq('role', setting.role)

        if (error) throw error
      }

      setMessage({ type: 'success', text: '設定を保存しました' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setMessage({ type: 'error', text: '設定の保存に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleResetUser = async (userId: string, userName: string) => {
    if (!supabase) return

    if (!confirm(`${userName}さんの本日の使用回数をリセットしますか？`)) {
      return
    }

    try {
      const { data, error } = await supabase.rpc('reset_user_daily_usage', {
        p_user_id: userId
      })

      if (error) throw error

      if (data?.success) {
        setMessage({ type: 'success', text: `${userName}さんの使用回数をリセットしました` })
        await loadUsageData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        throw new Error(data?.message || 'リセットに失敗しました')
      }
    } catch (err) {
      console.error('Failed to reset usage:', err)
      setMessage({ type: 'error', text: `リセットに失敗しました: ${err}` })
    }
  }

  const updateSetting = (role: string, field: 'daily_limit' | 'enabled', value: number | boolean) => {
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

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            ロール別AI使用制限設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            各ロールごとに1日あたりのAI利用回数の上限を設定できます。午前0時（日本時間）にリセットされます。
          </p>

          {settings.map(setting => (
            <div key={setting.role} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(setting.role)}>
                    {getRoleLabel(setting.role)}
                  </Badge>
                  <span className="text-sm font-medium">
                    {setting.role === 'admin' ? '（無制限固定）' : ''}
                  </span>
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
                <label className="text-sm font-medium min-w-[100px]">1日の上限:</label>
                {setting.role === 'admin' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="無制限"
                      disabled
                      className="px-3 py-2 border rounded-md bg-gray-100 text-gray-600 w-32"
                    />
                    <span className="text-xs text-muted-foreground">
                      管理者は常に無制限です
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={setting.daily_limit}
                      onChange={e =>
                        updateSetting(setting.role, 'daily_limit', parseInt(e.target.value) || 1)
                      }
                      className="px-3 py-2 border rounded-md w-32"
                    />
                    <span className="text-sm text-muted-foreground">回 / 日</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            本日の使用状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">本日の使用データはまだありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">ユーザー</th>
                    <th className="pb-2 font-medium">ロール</th>
                    <th className="pb-2 font-medium text-right">使用回数</th>
                    <th className="pb-2 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.map(user => {
                    const setting = settings.find(s => s.role === user.user_role)
                    const limit = setting?.daily_limit || 0
                    const isUnlimited = limit === -1

                    return (
                      <tr key={user.user_id} className="border-b">
                        <td className="py-3">{user.user_name}</td>
                        <td className="py-3">
                          <Badge className={getRoleBadgeColor(user.user_role)}>
                            {getRoleLabel(user.user_role)}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={
                              !isUnlimited && user.request_count >= limit
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            {user.request_count}回
                            {!isUnlimited && ` / ${limit}回`}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetUser(user.user_id, user.user_name)}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            リセット
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
