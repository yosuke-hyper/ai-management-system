import React, { useState, useEffect } from 'react'
import { Download, FileArchive, AlertCircle, CheckCircle } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function ProjectDownload() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProjectFiles = async () => {
      try {
        const imported = await import('../lib/projectFiles')
        setProjectFiles(imported.projectFiles || {})
        setIsLoading(false)
      } catch (e) {
        console.error('projectFiles.ts not found:', e)
        setError('プロジェクトファイルが見つかりません。本番ビルドでのみ利用可能です。')
        setIsLoading(false)
      }
    }
    loadProjectFiles()
  }, [])

  const handleDownload = async () => {
    if (Object.keys(projectFiles).length === 0) {
      setError('ダウンロード可能なファイルがありません。')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(false)

    try {
      const zip = new JSZip()

      for (const [filePath, content] of Object.entries(projectFiles)) {
        const relativePath = filePath.replace(/^\//, '')
        zip.file(relativePath, content)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const fileName = `ai-management-system-${new Date().toISOString().split('T')[0]}.zip`
      saveAs(blob, fileName)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // ページ読み込み時に自動的にダウンロードを開始
  useEffect(() => {
    if (!isLoading && Object.keys(projectFiles).length > 0) {
      handleDownload()
    }
  }, [isLoading, projectFiles])

  const fileCount = Object.keys(projectFiles).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <FileArchive className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            プロジェクトダウンロード
          </h1>
          <p className="text-slate-600">
            現在のプロジェクトファイルをZIP形式でダウンロードします
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">含まれるファイル：</h2>
          <div className="mb-4">
            <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {fileCount} ファイル
            </div>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2"></span>
              <span>ソースコード（src/ディレクトリ）</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2"></span>
              <span>データベースマイグレーション（supabase/migrations/）</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2"></span>
              <span>Edge Functions（supabase/functions/）</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2"></span>
              <span>設定ファイル（package.json、vite.config.ts等）</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2"></span>
              <span>ドキュメント（README.md等）</span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              プロジェクトファイルのダウンロードが完了しました！
            </div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ZIPファイルを生成中...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              プロジェクトをダウンロード
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            注意: .envファイルは含まれません。セキュリティのため、
            環境変数は別途管理してください。
          </p>
        </div>
      </div>
    </div>
  )
}
