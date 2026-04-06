import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultColors: ThemeColors = {
  primary: '#0f172a',
  secondary: '#64748b',
  accent: '#3b82f6',
};

export function ThemeProvider({ children, initialColors = defaultColors }: { children: React.ReactNode, initialColors?: ThemeColors }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colors, setColors] = useState<ThemeColors>(initialColors);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Helper to calculate foreground color based on luminance
    const getForeground = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    };

    // Set CSS variables
    root.style.setProperty('--primary-dynamic', colors.primary);
    root.style.setProperty('--primary-foreground-dynamic', getForeground(colors.primary));
    
    root.style.setProperty('--secondary-dynamic', colors.secondary);
    root.style.setProperty('--secondary-foreground-dynamic', getForeground(colors.secondary));
    
    root.style.setProperty('--accent-dynamic', colors.accent);
    root.style.setProperty('--accent-foreground-dynamic', getForeground(colors.accent));
  }, [colors]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, setColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
