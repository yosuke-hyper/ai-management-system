import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Mail, Link as LinkIcon, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { createInvitation, generateInvitationLink } from '@/services/organizationservice'
import { canInviteUser } from '@/services/usagelimits'
import { subscriptionService } from '@/services/subscriptionservice'
import { avatarToast } from '@/lib/avatartoast'

interface Props {
  organizationId: string
  userId: string
  onClose: () => void
  onInvited: () => void
}

export const InviteModal: React.FC<Props> = ({ organizationId, userId, onClose, onInvited }) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'manager' | 'staff'>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('メールアドレスを入力してください')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const limitCheck = await subscriptionService.canAddUser(organizationId)
      if (!limitCheck.allowed) {
        setError(limitCheck.reason || 'ユーザー数の上限に達しています')
        return
      }

      const { data, error: inviteError, emailSent } = await createInvitation(
        organizationId,
        email,
        role,
        userId
      )

      if (inviteError) {
        setError('招待の作成に失敗しました')
        return
      }

      if (data) {
        setSuccess(true)
        setInvitationLink(generateInvitationLink(data.token))

        if (emailSent) {
          avatarToast.success('招待メールを送信しました', {
            description: `${email}に招待メールを送信しました`
          })
        } else {
          avatarToast.info('招待リンクを作成しました', {
            description: 'メール送信に失敗したため、招待リンクをコピーして送信してください'
          })
        }

        onInvited()
      }
    } catch (err) {
      setError('招待の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!invitationLink) return

    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      avatarToast.success('コピーしました')
    } catch (err) {
      console.error('Failed to copy link:', err)
      avatarToast.error('コピーできませんでした')
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('staff')
    setError(null)
    setSuccess(false)
    setInvitationLink(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-w-[calc(100vw-32px)]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">メンバーを招待</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">招待を送信しました</p>
                  <p className="text-sm text-green-700 mt-1">
                    {email} に招待メールを送信しました
                  </p>
                </div>
              </div>

              {invitationLink && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <LinkIcon className="w-4 h-4 inline mr-2" />
                    招待リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invitationLink}
                      readOnly
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                    />
                    <Button
                      onClick={handleCopyLink}
                      className={`${
                        copied
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          コピー
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    このリンクは7日間有効です。リンクを共有して招待することもできます。
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={handleClose}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                >
                  閉じる
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  権限
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'owner' | 'admin' | 'manager' | 'staff')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="staff">スタッフ</option>
                  <option value="manager">マネージャー</option>
                  <option value="admin">管理者</option>
                  <option value="owner">オーナー</option>
                </select>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  {role === 'staff' && (
                    <p>スタッフ: 割り当てられた店舗のデータ入力のみ</p>
                  )}
                  {role === 'manager' && (
                    <p>マネージャー: 割り当てられた店舗の管理、レポート閲覧</p>
                  )}
                  {role === 'admin' && (
                    <p>管理者: 全店舗管理、組織設定の変更が可能</p>
                  )}
                  {role === 'owner' && (
                    <p>オーナー: 全ての権限と請求管理が可能</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                      送信中...
                    </>
                  ) : (
                    '招待を送信'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
