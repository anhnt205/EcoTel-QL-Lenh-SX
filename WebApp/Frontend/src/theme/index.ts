import { createTheme } from '@mui/material/styles';

// Màu chủ đạo mặc định của ứng dụng; có thể đổi trong Hệ thống > Cấu hình giao diện.
export const DEFAULT_PRIMARY = '#1976d2';

/**
 * Dựng theme gốc của ứng dụng. Không truyền màu (hoặc truyền đúng màu mặc định) thì ra đúng theme cũ;
 * màu tuỳ chỉnh thì để MUI tự tính light / dark / contrastText từ màu chính.
 */
export const buildAppTheme = (primary: string = DEFAULT_PRIMARY) => createTheme({
    palette: {
        primary: primary.toLowerCase() === DEFAULT_PRIMARY
            ? {
                main: DEFAULT_PRIMARY,
                light: '#42a5f5',
                dark: '#1565c0',
            }
            : { main: primary },
        secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2',
        },
        error: {
            main: '#d32f2f',
        },
        warning: {
            main: '#ed6c02',
        },
        info: {
            main: '#0288d1',
        },
        success: {
            main: '#2e7d32',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Times New Roman", Times, serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 500,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 500,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                },
            },
        },
    },
});

const theme = buildAppTheme();

export default theme;
