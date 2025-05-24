import { createTheme, PaletteMode } from '@mui/material';

/**
 * Creates and returns a theme object based on the specified mode
 * @param mode - 'light' or 'dark' mode
 * @returns Theme object for MUI
 */
export const createAppTheme = (mode: PaletteMode) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#1976d2' : '#90caf9',
      },
      secondary: {
        main: mode === 'light' ? '#f50057' : '#f48fb1',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? '#1976d2' : '#272727',
          },
        },
      },
    },
  });
};

/**
 * Toggles between light and dark mode
 * @param currentMode - Current theme mode ('light' or 'dark')
 * @returns The opposite mode
 */
export const toggleThemeMode = (currentMode: PaletteMode): PaletteMode => {
  return currentMode === 'light' ? 'dark' : 'light';
};

/**
 * Saves the current theme mode to localStorage
 * @param mode - The theme mode to save
 */
export const saveThemePreference = (mode: PaletteMode): void => {
  localStorage.setItem('themeMode', mode);
};

/**
 * Gets the saved theme preference from localStorage
 * @returns The saved theme mode or 'light' as default
 */
export const getSavedThemePreference = (): PaletteMode => {
  return (localStorage.getItem('themeMode') as PaletteMode) || 'light';
}; 