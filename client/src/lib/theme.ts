export type ThemeMode = 'light' | 'dark'

export const themeConfig = {
  storageKey: 'ui-theme',
  defaultMode: 'light' as ThemeMode,
  cookieMaxAge: 60 * 60 * 24 * 365,
} as const

export const THEME_STORAGE_KEY = themeConfig.storageKey
export const DEFAULT_THEME_MODE = themeConfig.defaultMode
export const THEME_COOKIE_MAX_AGE = themeConfig.cookieMaxAge

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function resolveThemeMode(
  value: string | null | undefined,
  fallback: ThemeMode = DEFAULT_THEME_MODE,
): ThemeMode {
  return isThemeMode(value) ? value : fallback
}

export function getThemeClassName(theme: ThemeMode) {
  return theme === 'dark' ? 'dark' : undefined
}

export function applyThemeMode(theme: ThemeMode, root?: HTMLElement | null) {
  const element =
    root ??
    (typeof document !== 'undefined' ? document.documentElement : null)

  if (!element) {
    return
  }

  element.classList.toggle('dark', theme === 'dark')
  element.dataset.theme = theme
}

export function getThemeInitializerScript() {
  return `(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const defaultTheme = '${DEFAULT_THEME_MODE}';
  const getCookieTheme = () => {
    const match = document.cookie.match(new RegExp('(?:^|; )' + storageKey + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };
  const applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  };
  try {
    const storedTheme = localStorage.getItem(storageKey);
    const cookieTheme = getCookieTheme();
    const theme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : cookieTheme === 'light' || cookieTheme === 'dark'
          ? cookieTheme
          : defaultTheme;
    applyTheme(theme);
  } catch {
    applyTheme(defaultTheme);
  }
})();`
}
