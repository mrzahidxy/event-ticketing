import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function toTitleCase(value: string) {
  return compactWhitespace(value)
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function slugify(value: string) {
  return compactWhitespace(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getInitials(value: string, maxLength = 2) {
  const words = compactWhitespace(value).split(' ').filter(Boolean)
  if (words.length === 0) {
    return ''
  }

  return words
    .slice(0, maxLength)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}
