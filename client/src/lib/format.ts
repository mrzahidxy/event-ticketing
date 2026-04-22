type FormatLocale = string | string[]

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value)
}

export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: FormatLocale = 'en-US',
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: Date | string | number, locale: FormatLocale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(toDate(value))
}

export function formatDateTime(
  value: Date | string | number,
  locale: FormatLocale = 'en-US',
) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value))
}

export function formatCompactNumber(value: number, locale: FormatLocale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatFileSize(bytes: number, locale: FormatLocale = 'en-US') {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** exponent

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: size >= 10 ? 0 : 1,
  }).format(size)} ${units[exponent]}`
}

export function formatPercent(value: number, fractionDigits = 1) {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  const formattedValue = formatter.format(Math.abs(normalized))
  const sign = normalized >= 0 ? '+' : '-'
  return `${sign}${formattedValue}%`
}

export function formatRelativeDate(
  value: Date | string | number,
  locale: FormatLocale = 'en-US',
) {
  const timestamp = toDate(value).getTime()
  const diffInSeconds = Math.round((timestamp - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(diffInSeconds, 'second')
  }

  const diffInMinutes = Math.round(diffInSeconds / 60)
  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, 'minute')
  }

  const diffInHours = Math.round(diffInMinutes / 60)
  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, 'hour')
  }

  const diffInDays = Math.round(diffInHours / 24)
  if (Math.abs(diffInDays) < 30) {
    return formatter.format(diffInDays, 'day')
  }

  const diffInMonths = Math.round(diffInDays / 30)
  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(diffInMonths, 'month')
  }

  return formatter.format(Math.round(diffInDays / 365), 'year')
}
