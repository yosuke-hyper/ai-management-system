export const ric: typeof requestIdleCallback = (cb: any, opts?: any) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(cb, opts)
  }
  return window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1) as any
}

export const cic: typeof cancelIdleCallback = (id: any) => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    return window.cancelIdleCallback(id)
  }
  clearTimeout(id)
}
