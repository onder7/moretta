import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Gündüz moduna geç' : 'Gece moduna geç'}
      title={isDark ? 'Gündüz modu' : 'Gece modu'}
      className={`inline-flex items-center gap-1.5 transition-colors ${className}`}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
      {showLabel && <span className="text-xs font-medium">{isDark ? 'Gündüz' : 'Gece'}</span>}
    </button>
  );
}
