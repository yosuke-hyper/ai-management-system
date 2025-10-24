export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}

export const formatNumber = (value: number): string => {
  return value.toLocaleString('ja-JP')
}

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateRange = (start: Date, end: Date): string => {
  return `${formatDate(start)} - ${formatDate(end)}`
}

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}