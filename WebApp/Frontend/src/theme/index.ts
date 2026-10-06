import { createTheme, darken, lighten, getContrastRatio } from '@mui/material/styles';

// Màu chủ đạo mặc định của ứng dụng; có thể đổi trong Hệ thống > Cấu hình giao diện.
export const DEFAULT_PRIMARY = '#1976d2';

/**
 * Các sắc xanh "thương hiệu" từng được viết cứng khắp giao diện (tiêu đề trang, dòng xen kẽ của bảng, mục đang chọn...).
 * Dùng qua theme (sx: color="brand.title", bgcolor="brand.zebra"...) để đổi màu chủ đạo là đổi cả giao diện.
 */
export interface BrandPalette {
    /** Chữ tiêu đề trang */
    title: string;
    /** Nền dòng xen kẽ của bảng / danh sách */
    zebra: string;
    /** Chữ nhấn (mục đang chọn, liên kết khi rê chuột) */
    strong: string;
    /** Nền nhạt của mục đang chọn */
    tint: string;
    /** Viền của mục đang chọn */
    border: string;
    /** Nền + chữ của nhãn nhỏ (số thứ tự biểu mẫu...) */
    chipBg: string;
    chipText: string;
    /** Nút đặc (nền màu chủ đạo), khi rê chuột, và chữ trên nút */
    solid: string;
    solidHover: string;
    onSolid: string;
}

declare module '@mui/material/styles' {
    interface Palette {
        brand: BrandPalette;
    }
    interface PaletteOptions {
        brand?: BrandPalette;
    }
}

const isDefaultPrimary = (primary: string) => primary.toLowerCase() === DEFAULT_PRIMARY;

// Làm đậm dần cho tới khi chữ màu đó đọc được trên nền trắng (màu chủ đạo quá nhạt như vàng vẫn dùng được làm chữ)
const readable = (color: string, minRatio: number) => {
    let c = color;
    for (let i = 0; i < 10 && getContrastRatio(c, '#fff') < minRatio; i += 1) c = darken(c, 0.12);
    return c;
};

/** Nền thanh trên cùng (Header): mặc định là navy đã duyệt theo ảnh mẫu, màu tuỳ chỉnh thì chính là màu đã chọn. */
export const brandHeaderBg = (primary: string) => (isDefaultPrimary(primary) ? '#0f2a55' : primary);

/** Màu chữ / biểu tượng đặt trên một nền màu: trắng, hoặc tối nếu nền quá sáng để chữ trắng đọc được. */
export const brandOnColor = (bg: string) => (getContrastRatio(bg, '#fff') >= 3 ? '#fff' : '#0f172a');

/**
 * Màu mặc định giữ ĐÚNG các sắc cũ (không đổi giao diện khi chưa tuỳ chỉnh); màu tuỳ chỉnh thì suy ra từ màu chính.
 */
export const buildBrandPalette = (primary: string = DEFAULT_PRIMARY): BrandPalette =>
    isDefaultPrimary(primary)
        ? {
            title: 'blue',
            zebra: '#e3f2fd',
            strong: '#1d4ed8',
            tint: '#e8f0fe',
            border: '#93b4f5',
            chipBg: '#eef2ff',
            chipText: '#3b5bdb',
            solid: '#1d5fd1',
            solidHover: '#174fb0',
            onSolid: '#fff',
        }
        : {
            title: readable(primary, 3),
            zebra: lighten(primary, 0.9),
            strong: readable(primary, 4.5),
            tint: lighten(primary, 0.88),
            border: lighten(primary, 0.5),
            chipBg: lighten(primary, 0.92),
            chipText: readable(primary, 4.5),
            solid: primary,
            solidHover: darken(primary, 0.12),
            onSolid: getContrastRatio(primary, '#fff') >= 3 ? '#fff' : '#0f172a',
        };

/**
 * Dựng theme gốc của ứng dụng. Không truyền màu (hoặc truyền đúng màu mặc định) thì ra đúng theme cũ;
 * màu tuỳ chỉnh thì để MUI tự tính light / dark / contrastText từ màu chính.
 */
export const buildAppTheme = (primary: string = DEFAULT_PRIMARY) => createTheme({
    palette: {
        brand: buildBrandPalette(primary),
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
