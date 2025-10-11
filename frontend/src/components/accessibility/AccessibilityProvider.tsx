import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useMediaQuery } from '@mui/material';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  colorBlindSupport: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  theme: 'light' | 'dark' | 'auto';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  isAccessibilityMode: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: false,
  focusIndicators: true,
  colorBlindSupport: false,
  fontSize: 'medium',
  theme: 'auto'
};

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Apply system preferences
    if (settings.theme === 'auto') {
      setSettings(prev => ({ ...prev, theme: prefersDarkMode ? 'dark' : 'light' }));
    }
    
    if (prefersReducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }
  }, [prefersDarkMode, prefersReducedMotion, settings.theme]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const isAccessibilityMode = Object.values(settings).some(value => 
    typeof value === 'boolean' ? value : value !== 'medium' && value !== 'auto'
  );

  // Create theme based on accessibility settings
  const theme = createTheme({
    palette: {
      mode: settings.theme === 'auto' ? (prefersDarkMode ? 'dark' : 'light') : settings.theme,
      ...(settings.highContrast && {
        primary: { main: '#000000' },
        secondary: { main: '#000000' },
        error: { main: '#FF0000' },
        warning: { main: '#FFA500' },
        info: { main: '#0000FF' },
        success: { main: '#008000' }
      }),
      ...(settings.colorBlindSupport && {
        primary: { main: '#1f77b4' },
        secondary: { main: '#ff7f0e' },
        error: { main: '#d62728' },
        warning: { main: '#ff7f0e' },
        info: { main: '#2ca02c' },
        success: { main: '#2ca02c' }
      })
    },
    typography: {
      fontSize: settings.fontSize === 'small' ? 12 : 
                settings.fontSize === 'medium' ? 14 :
                settings.fontSize === 'large' ? 16 : 18,
      ...(settings.largeText && {
        h1: { fontSize: '3rem' },
        h2: { fontSize: '2.5rem' },
        h3: { fontSize: '2rem' },
        h4: { fontSize: '1.75rem' },
        h5: { fontSize: '1.5rem' },
        h6: { fontSize: '1.25rem' },
        body1: { fontSize: '1.125rem' },
        body2: { fontSize: '1rem' }
      })
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            ...(settings.focusIndicators && {
              '&:focus': {
                outline: '2px solid #000',
                outlineOffset: '2px'
              }
            }),
            ...(settings.largeText && {
              padding: '12px 24px',
              fontSize: '1.125rem'
            })
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            ...(settings.focusIndicators && {
              '& .MuiOutlinedInput-root:focus-within': {
                outline: '2px solid #000',
                outlineOffset: '2px'
              }
            })
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            ...(settings.highContrast && {
              border: '2px solid #000'
            })
          }
        }
      }
    },
    ...(settings.reducedMotion && {
      transitions: {
        duration: {
          shortest: 0,
          shorter: 0,
          short: 0,
          standard: 0,
          complex: 0,
          enteringScreen: 0,
          leavingScreen: 0
        }
      }
    })
  });

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
    isAccessibilityMode
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility utilities
export const AccessibilityUtils = {
  // Announce to screen readers
  announce: (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Skip to main content
  skipToMain: () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  },

  // Focus management
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },

  // High contrast mode
  applyHighContrast: (enabled: boolean) => {
    document.body.style.filter = enabled ? 'contrast(150%) brightness(1.2)' : 'none';
  },

  // Reduced motion
  applyReducedMotion: (enabled: boolean) => {
    if (enabled) {
      document.body.style.setProperty('--animation-duration', '0s');
      document.body.style.setProperty('--transition-duration', '0s');
    } else {
      document.body.style.removeProperty('--animation-duration');
      document.body.style.removeProperty('--transition-duration');
    }
  }
};

export default AccessibilityProvider;
