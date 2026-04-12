import { useEffect, useCallback, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

// Theme hook
export function useTheme(theme: ThemeMode) {
  const resolve = useCallback((mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolve(theme));

  useEffect(() => {
    const apply = (mode: ThemeMode) => {
      const resolved = resolve(mode);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      setResolvedTheme(resolved);
    };

    apply(theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => apply('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, resolve]);

  return resolvedTheme;
}
