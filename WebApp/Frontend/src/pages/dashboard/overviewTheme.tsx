// Bảng màu sáng/tối của trang Tổng quan (quả cầu + hàng bảng). Chỉ chứa màu — không có logic nghiệp vụ.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StatusDeviceEnum } from '../../enums';
import { MONO } from './overviewShared';

export type OverviewMode = 'dark' | 'light';

export interface Palette {
    mode: OverviewMode;
    pageBg: string;
    accent: string;
    ink: string; // chữ chính
    soft: string; // chữ phụ đậm
    muted: string; // chữ nhãn mờ
    track: string; // nền thanh tỉ lệ
    faint: string; // số 0 / chấm chưa chọn
    dotHover: string;
    // Quả cầu
    heroBg: string;
    heroBorder: string;
    glow: [string, string, string];
    orbit: string;
    linkRgb: string;
    satelliteRgb: string;
    dotHot: string;
    dotNear: string;
    dotFar: string;
    // Thẻ / bảng HUD
    hudBg: string;
    hudBorder: string;
    hudShadow: string;
    hudColor: string;
    panelBg: string;
    cardBg: string;
    cardSolid: string;
    cardBorder: string;
    cardBorderStrip: string;
    cardShadow: string;
    cardHoverShadow: string;
    panelHoverShadow: string;
    accentLine: string;
    // Chữ nổi ở giữa
    halo: string;
    centerName: string;
    centerBig: string;
    centerBigShadow: string;
    centerLabel: string;
    centerText: string;
    centerStrong: string;
    centerShiftStrong: string;
    // Trạng thái / lệnh / ca
    status: [string, string, string, string];
    order: [string, string, string, string, string];
    shift: [string, string, string];
    // Hộp chi tiết
    dialogBg: string;
    dialogHeadBg: string;
    dialogHeadColor: string;
}

const HALO_LIGHT = '0 0 8px #f1f5f8, 0 0 16px #f1f5f8';

export const DARK: Palette = {
    mode: 'dark',
    pageBg: '#0a0807',
    accent: '#ff8a1f',
    ink: '#f3f4f6',
    soft: '#cbd0d8',
    muted: '#9ca3af',
    track: 'rgba(255,255,255,0.08)',
    faint: 'rgba(255,255,255,0.25)',
    dotHover: 'rgba(255,255,255,0.55)',
    heroBg: 'radial-gradient(ellipse at 50% 46%, #22140a 0%, #0d0a08 52%, #060606 100%)',
    heroBorder: '#1f1a16',
    glow: ['rgba(255,120,30,0.26)', 'rgba(255,120,30,0.07)', 'rgba(255,120,30,0)'],
    orbit: 'rgba(255,150,60,0.22)',
    linkRgb: '255,140,50',
    satelliteRgb: '255,200,130',
    dotHot: '#ffd29a',
    dotNear: '#ff7a1a',
    dotFar: '#c2530f',
    hudBg: 'rgba(14,12,11,0.78)',
    hudBorder: 'rgba(255,255,255,0.09)',
    hudShadow: 'none',
    hudColor: '#e5e7eb',
    panelBg: 'rgba(14,12,11,0.92)',
    cardBg: 'rgba(16,13,11,0.88)',
    cardSolid: '#0d0a08',
    cardBorder: 'rgba(255,138,31,0.28)',
    cardBorderStrip: 'rgba(255,138,31,0.35)',
    cardShadow: 'none',
    cardHoverShadow: '0 0 26px rgba(255,138,31,0.4)',
    panelHoverShadow: '0 0 22px rgba(255,138,31,0.28)',
    accentLine: 'rgba(255,138,31,0.5)',
    halo: '0 1px 6px rgba(0,0,0,.95), 0 0 14px rgba(0,0,0,.9)',
    centerName: '#f5e6d6',
    centerBig: '#ffc58a',
    centerBigShadow: [
        '0 1px 0 #f0833a',
        '0 2px 0 #d86b25',
        '0 3px 0 #bf571b',
        '0 4px 0 #a04614',
        '0 5px 0 #80380f',
        '0 6px 0 #612a0b',
        '0 12px 14px rgba(0,0,0,.65)',
        '0 0 34px rgba(255,122,26,.55)',
        '0 0 90px rgba(255,122,26,.35)',
    ].join(','),
    centerLabel: '#c9a98a',
    centerText: '#e5e7eb',
    centerStrong: '#ffc58a',
    centerShiftStrong: '#fff',
    status: ['#4ade80', '#ff5a4f', '#ffb020', '#8b93a1'],
    order: ['#9ca3af', '#4ade80', '#ffb020', '#ff5a4f', '#a855f7'],
    shift: ['#ffb066', '#ff8a1f', '#c2530f'],
    dialogBg: '#f3f5f9',
    dialogHeadBg: '#0d0a08',
    dialogHeadColor: '#f3f4f6',
};

export const LIGHT: Palette = {
    mode: 'light',
    pageBg: '#f1f5f8',
    accent: '#ea6a0a',
    ink: '#1e293b',
    soft: '#475569',
    muted: '#64748b',
    track: 'rgba(15,23,42,0.09)',
    faint: 'rgba(15,23,42,0.28)',
    dotHover: 'rgba(15,23,42,0.5)',
    heroBg: 'radial-gradient(ellipse at 50% 46%, #ffffff 0%, #f1f5f8 62%, #e7edf2 100%)',
    heroBorder: '#d5dee7',
    glow: ['rgba(255,120,30,0.16)', 'rgba(255,120,30,0.05)', 'rgba(255,120,30,0)'],
    orbit: 'rgba(234,106,10,0.3)',
    linkRgb: '234,106,10',
    satelliteRgb: '234,106,10',
    dotHot: '#f59e0b',
    dotNear: '#f26a0f',
    dotFar: '#e8a56a',
    hudBg: 'rgba(255,255,255,0.86)',
    hudBorder: '#d5dee7',
    hudShadow: '0 1px 2px rgba(15,23,42,0.05)',
    hudColor: '#1e293b',
    panelBg: '#ffffff',
    cardBg: 'rgba(255,255,255,0.94)',
    cardSolid: '#ffffff',
    cardBorder: 'rgba(234,106,10,0.4)',
    cardBorderStrip: 'rgba(234,106,10,0.4)',
    cardShadow: '0 2px 8px rgba(15,23,42,0.08)',
    cardHoverShadow: '0 6px 22px rgba(234,106,10,0.28)',
    panelHoverShadow: '0 6px 20px rgba(234,106,10,0.22)',
    accentLine: 'rgba(234,106,10,0.5)',
    halo: HALO_LIGHT,
    centerName: '#7c2d12',
    centerBig: '#ff9a3c',
    centerBigShadow: [
        '0 1px 0 #f0833a',
        '0 2px 0 #d86b25',
        '0 3px 0 #bf571b',
        '0 4px 0 #a04614',
        '0 5px 0 #80380f',
        '0 6px 0 #612a0b',
        '0 12px 14px rgba(120,60,10,.35)',
        '0 0 30px rgba(255,122,26,.3)',
        '0 0 80px rgba(255,122,26,.18)',
    ].join(','),
    centerLabel: '#64748b',
    centerText: '#1e293b',
    centerStrong: '#ea6a0a',
    centerShiftStrong: '#1e293b',
    status: ['#16a34a', '#e5483d', '#d97706', '#94a3b8'],
    order: ['#64748b', '#16a34a', '#d97706', '#e5483d', '#9333ea'],
    shift: ['#fdba74', '#f97316', '#c2410c'],
    dialogBg: '#f1f5f8',
    dialogHeadBg: '#ffffff',
    dialogHeadColor: '#1e293b',
};

const STORAGE_KEY = 'dpmm.overview.mode';

const readMode = (): OverviewMode => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
};

interface Ctx {
    p: Palette;
    toggle: () => void;
}

const OverviewThemeContext = createContext<Ctx>({ p: LIGHT, toggle: () => undefined });

export function OverviewThemeProvider({ children }: { children: (ctx: Ctx) => React.ReactNode }) {
    const [mode, setMode] = useState<OverviewMode>(readMode);
    const toggle = useCallback(() => {
        setMode((m) => {
            const next = m === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                /* bộ nhớ trình duyệt bị chặn: vẫn đổi được trong phiên này */
            }
            return next;
        });
    }, []);
    const value = useMemo(() => ({ p: mode === 'dark' ? DARK : LIGHT, toggle }), [mode, toggle]);
    return <OverviewThemeContext.Provider value={value}>{children(value)}</OverviewThemeContext.Provider>;
}

export const useOverviewTheme = () => useContext(OverviewThemeContext);

/** Danh sách trạng thái thiết bị với màu theo bảng màu hiện tại. */
export const statusWith = (
    base: { key: StatusDeviceEnum; label: string; short: string }[],
    p: Palette,
) => base.map((s, i) => ({ ...s, color: p.status[i] }));

export const hudPanelSx = (p: Palette) =>
    ({
        bgcolor: p.hudBg,
        border: `1px solid ${p.hudBorder}`,
        boxShadow: p.hudShadow,
        borderRadius: '8px',
        backdropFilter: 'blur(6px)',
        color: p.hudColor,
        fontFamily: MONO,
    }) as const;
