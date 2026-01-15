/**
 * モックデータのキャッシュ管理
 * - メモリキャッシュ（高速）
 * - localStorageキャッシュ（永続化）
 * - ✅ 複数キーを個別に保存する方式（上書きバグ修正）
 */

type MockKey = string

// メモリキャッシュ（セッション中のみ）
const RAM_CACHE = new Map<MockKey, any>()

// localStorageのキー接頭辞（キーごとに個別保存）
// v3: ランチ/ディナー分割対応
const LS_PREFIX = 'demoMock:v3:'

/**
 * キャッシュからデータを取得
 */
export function getMockCache(key: MockKey): any | null {
  // メモリキャッシュを優先
  if (RAM_CACHE.has(key)) {
    return RAM_CACHE.get(key)
  }

  // localStorageから個別キーで取得
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    // メモリキャッシュにも保存
    RAM_CACHE.set(key, parsed)
    return parsed
  } catch (err) {
    console.warn('Failed to read mock cache from localStorage:', err)
    return null
  }
}

/**
 * キャッシュにデータを保存
 */
export function setMockCache(key: MockKey, value: any): void {
  // メモリキャッシュに保存
  RAM_CACHE.set(key, value)

  // localStorageにキー別で永続化（上書き防止）
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch (err) {
    console.warn('Failed to save mock cache to localStorage:', err)
  }
}

/**
 * キャッシュをクリア
 * @param pattern 指定した場合、そのパターンを含むキーのみクリア
 */
export function clearMockCache(pattern?: string): void {
  RAM_CACHE.clear()

  try {
    if (!pattern) {
      // パターン指定なし：全てのデモキャッシュをクリア
      Object.keys(localStorage)
        .filter(k => k.startsWith(LS_PREFIX))
        .forEach(k => localStorage.removeItem(k))
    } else {
      // パターン指定あり：該当するキーのみクリア
      Object.keys(localStorage)
        .filter(k => k.startsWith(LS_PREFIX) && k.includes(pattern))
        .forEach(k => localStorage.removeItem(k))
    }
  } catch (err) {
    console.warn('Failed to clear mock cache:', err)
  }
}
