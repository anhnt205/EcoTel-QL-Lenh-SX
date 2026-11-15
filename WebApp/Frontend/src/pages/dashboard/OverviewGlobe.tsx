import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    DeptCardData,
    fmt,
    ledOf,
    MONO,
    STATUS,
    useDeptCards,
    useProductionMetrics,
} from './overviewShared';
import { hudPanelSx, statusWith, useOverviewTheme } from './overviewTheme';
import {
    assignToRing,
    fibonacciSphere,
    project,
    ringPoint,
    rotateX,
    rotateY,
    Ring,
} from './globeMath';

// ───────────────────────── Hằng số ─────────────────────────
const CARD_W = 200;
const CARD_H = 92;
const SPHERE_POINTS = 1500;
const SPHERE = fibonacciSphere(SPHERE_POINTS);

// Các quỹ đạo của thẻ đơn vị quanh quả cầu (đơn vị = bán kính quả cầu).
const RINGS: Ring[] = [
    // Nghiêng đủ lớn để thẻ đi qua phía trên/dưới vùng chữ sản lượng, không cắt ngang chữ.
    { rx: 1.55, rz: 1.55, tiltX: 0.6, tiltZ: 0.05, speed: 0.07, phase: 0 },
    { rx: 1.95, rz: 1.95, tiltX: 0.95, tiltZ: -0.3, speed: -0.05, phase: 1.1 },
    { rx: 1.45, rz: 1.45, tiltX: -0.72, tiltZ: 0.5, speed: 0.04, phase: 2.3 },
];
const RING_EXTENT = Math.max(...RINGS.map((r) => Math.max(r.rx, r.rz)));

// ───────────────────────── Thành phần nhỏ ─────────────────────────
function AnimatedNumber({ value }: { value: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const shown = useRef(0);
    useEffect(() => {
        const from = shown.current;
        const start = performance.now();
        let raf = 0;
        const step = (now: number) => {
            const k = Math.min(1, (now - start) / 900);
            const eased = 1 - Math.pow(1 - k, 3);
            shown.current = from + (value - from) * eased;
            if (ref.current) ref.current.textContent = fmt(shown.current);
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value]);
    return <span ref={ref}>0</span>;
}

function HudClock() {
    const { p } = useOverviewTheme();
    const [now, setNow] = useState(() => dayjs());
    useEffect(() => {
        const id = setInterval(() => setNow(dayjs()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, letterSpacing: 1, lineHeight: 1.1, color: p.ink }}>
                {now.format('HH:mm:ss')}
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 12, color: p.muted }}>
                {now.format('DD/MM/YYYY')}
            </Typography>
        </Box>
    );
}

function PanelTitle({ no, children }: { no: string; children: React.ReactNode }) {
    const { p } = useOverviewTheme();
    return (
        <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: p.muted, mb: 0.75 }}>
            <b style={{ color: p.accent, marginRight: 8 }}>{no}</b>
            {children}
        </Typography>
    );
}

// Thân thẻ đơn vị: dùng chung cho thẻ chạy quỹ đạo (desktop) và dải cuộn ngang (màn hẹp).
function DeptCardBody({ c }: { c: DeptCardData }) {
    const { p } = useOverviewTheme();
    const status = statusWith(STATUS, p);
    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: ledOf(c.totals, p.status),
                        boxShadow: `0 0 8px ${ledOf(c.totals, p.status)}`,
                    }}
                />
                <Typography noWrap sx={{ flex: 1, fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: p.ink }}>
                    {c.name}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 11, color: p.muted }}>
                    Tổng <b style={{ fontSize: 14, color: p.ink }}>{c.total}</b>
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', bgcolor: p.track, mt: 0.75 }}>
                {status.map((s) =>
                    c.totals[s.key] > 0 ? (
                        <Box key={s.key} sx={{ width: `${(c.totals[s.key] / c.total) * 100}%`, bgcolor: s.color }} />
                    ) : null,
                )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', mt: 0.75, textAlign: 'center' }}>
                {status.map((s) => (
                    <Box key={s.key}>
                        <Typography
                            sx={{
                                fontFamily: MONO,
                                fontSize: 16,
                                fontWeight: 800,
                                lineHeight: 1.15,
                                color: c.totals[s.key] > 0 ? s.color : p.faint,
                            }}
                        >
                            {c.totals[s.key]}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: p.muted, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                            {s.short}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </>
    );
}

// ───────────────────────── Thành phần chính ─────────────────────────
interface Props {
    machineCount: number;
    vehicleCount: number;
    departmentCount: number;
    userCount: number;
}

export default function OverviewGlobe({ machineCount, vehicleCount, departmentCount, userCount }: Props) {
    const navigate = useNavigate();
    const isNarrow = useMediaQuery('(max-width:640px)');
    const { p, toggle } = useOverviewTheme();
    const pRef = useRef(p);
    pRef.current = p; // vòng vẽ đọc màu mới nhất mà không phải khởi động lại

    const boxRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cardEls = useRef<(HTMLDivElement | null)[]>([]);
    const hovered = useRef(-1);

    // Dữ liệu dùng chung với hàng bảng bên dưới (overviewShared.ts): cùng queryKey nên không thêm request.
    const { cards, grandTotal } = useDeptCards();
    const { today, metrics } = useProductionMetrics();

    // Chữ nổi ở giữa tự đổi chỉ tiêu sản lượng mỗi 6 giây; bấm chấm tròn để chọn tay.
    const [metricIdx, setMetricIdx] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setMetricIdx((i) => (i + 1) % metrics.length), 6000);
        return () => clearInterval(id);
    }, [metrics.length, metricIdx]);
    const metric = metrics[metricIdx] ?? metrics[0];

    // ── Vòng lặp vẽ: canvas (quả cầu chấm + quỹ đạo) và vị trí các thẻ DOM dùng chung một phép chiếu
    const cardCount = isNarrow ? 0 : cards.length; // màn hẹp: không chạy quỹ đạo
    useEffect(() => {
        const box = boxRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!box || !canvas || !ctx) return;

        const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let w = 0;
        let h = 0;
        const resize = () => {
            const rect = box.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        const ro = new ResizeObserver(resize);
        ro.observe(box);
        resize();

        let raf = 0;
        let last = performance.now();
        let spin = 0; // góc quay của quả cầu (luôn chạy)
        let orbit = 0; // thời gian quỹ đạo (dừng khi rê chuột vào thẻ)
        let orbitSpeed = 1;

        const frame = (now: number) => {
            const P = pRef.current;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!reduceMotion) {
                spin += dt * 0.14;
                const target = hovered.current >= 0 ? 0 : 1;
                orbitSpeed += (target - orbitSpeed) * Math.min(1, dt * 6);
                orbit += dt * orbitSpeed;
            }

            const cx = w / 2;
            const cy = h / 2;
            const R = Math.max(60, Math.min(h * 0.37, w * (w < 640 ? 0.3 : 0.2)));
            const stretch = Math.min(2.6, Math.max(1, (w * 0.4) / (RING_EXTENT * R)));
            const cardScaleBase = w < 640 ? 0.8 : 1;

            ctx.clearRect(0, 0, w, h);

            // Quầng sáng sau quả cầu
            const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
            glow.addColorStop(0, P.glow[0]);
            glow.addColorStop(0.55, P.glow[1]);
            glow.addColorStop(1, P.glow[2]);
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, w, h);

            // Quỹ đạo (nét đứt)
            ctx.save();
            ctx.setLineDash([3, 7]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = P.orbit;
            (cardCount > 0 ? RINGS : []).forEach((ring) => {
                ctx.beginPath();
                for (let i = 0; i <= 96; i++) {
                    const p = ringPoint(ring, (i / 96) * Math.PI * 2);
                    p.x *= stretch;
                    const s = project(p, cx, cy, R, RING_EXTENT);
                    if (i === 0) ctx.moveTo(s.x, s.y);
                    else ctx.lineTo(s.x, s.y);
                }
                ctx.stroke();
            });
            ctx.restore();

            // Vị trí từng thẻ trên quỹ đạo → vẽ đường nối + đặt transform cho thẻ DOM
            for (let i = 0; i < cardCount; i++) {
                const el = cardEls.current[i];
                if (!el) continue;
                const { ring: ri, slot, slots } = assignToRing(i, cardCount, RINGS.length);
                const ring = RINGS[ri];
                const theta = (slot / slots) * Math.PI * 2 + ring.phase + orbit * ring.speed * Math.PI * 2;
                const p3 = ringPoint(ring, theta);
                p3.x *= stretch;
                const s = project(p3, cx, cy, R, RING_EXTENT);
                const isHover = hovered.current === i;
                const sc = (0.62 + 0.5 * s.depth) * cardScaleBase * (isHover ? 1.12 : 1);
                const half = (CARD_H * sc) / 2 + 6;
                const y = Math.min(h - half, Math.max(half, s.y));
                const opacity = isHover ? 1 : 0.2 + 0.8 * Math.pow(s.depth, 1.3);

                el.style.transform = `translate3d(${s.x - CARD_W / 2}px, ${y - CARD_H / 2}px, 0) scale(${sc})`;
                el.style.opacity = String(opacity);
                el.style.zIndex = String(isHover ? 150 : Math.round(s.depth * 100));

                ctx.strokeStyle = `rgba(${P.linkRgb},${0.06 + 0.24 * s.depth})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(s.x, y);
                ctx.stroke();
            }

            // Quả cầu chấm
            const ang = spin;
            for (let i = 0; i < SPHERE_POINTS; i++) {
                const p = rotateX(rotateY(SPHERE[i], ang), 0.3);
                const near = (p.z + 1) / 2; // 0..1
                const hot = i % 19 === 0;
                const size = (hot ? 1.6 : 0.8) + near * (hot ? 1.8 : 1.1);
                ctx.globalAlpha = (hot ? 0.45 : 0.14) + near * (hot ? 0.55 : 0.72);
                ctx.fillStyle = hot ? P.dotHot : near > 0.5 ? P.dotNear : P.dotFar;
                ctx.beginPath();
                ctx.arc(cx + p.x * R, cy - p.y * R, size / 2 + 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Vệ tinh nhỏ chạy trên mỗi quỹ đạo
            (cardCount > 0 ? RINGS : []).forEach((ring, ri) => {
                const p3 = ringPoint(ring, orbit * ring.speed * Math.PI * 2 * 2.5 + ri * 2);
                p3.x *= stretch;
                const s = project(p3, cx, cy, R, RING_EXTENT);
                ctx.fillStyle = `rgba(${P.satelliteRgb},${0.4 + 0.6 * s.depth})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 2.2 + 1.6 * s.depth, 0, Math.PI * 2);
                ctx.fill();
            });

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [cardCount]);

    const bracket = {
        content: '""',
        position: 'absolute',
        width: 9,
        height: 9,
        borderColor: p.accent,
        borderStyle: 'solid',
        borderWidth: 0,
    } as const;

    return (
        <>
        <Box
            ref={boxRef}
            sx={{
                position: 'relative',
                isolation: 'isolate',
                overflow: 'hidden',
                // md+: lấp đầy khung cha (Dashboard tính chiều cao vừa 1 trang); nhỏ hơn: chiều cao cố định.
                height: { xs: 400, sm: 470, md: '100%' },
                minHeight: { md: 300 },
                borderRadius: '14px',
                color: p.centerText,
                fontFamily: MONO,
                background: p.heroBg,
                border: `1px solid ${p.heroBorder}`,
                '@keyframes gpFade': {
                    from: { opacity: 0, transform: 'translateY(8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                '@keyframes gpFloat': {
                    '0%,100%': { transform: 'perspective(700px) rotateX(14deg) translateY(0)' },
                    '50%': { transform: 'perspective(700px) rotateX(14deg) translateY(-5px)' },
                },
            }}
        >
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

            {/* Thẻ đơn vị chạy quanh quả cầu */}
            {!isNarrow && cards.map((c, i) => (
                <Box
                    key={c.name}
                    ref={(el: HTMLDivElement | null) => {
                        cardEls.current[i] = el;
                    }}
                    onMouseEnter={() => {
                        hovered.current = i;
                    }}
                    onMouseLeave={() => {
                        if (hovered.current === i) hovered.current = -1;
                    }}
                    title={`${c.name} — ${statusWith(STATUS, p).map((s) => `${s.label}: ${c.totals[s.key]}`).join(' · ')}`}
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: CARD_W,
                        height: CARD_H,
                        p: '8px 10px',
                        opacity: 0,
                        willChange: 'transform, opacity',
                        bgcolor: p.cardBg,
                        border: `1px solid ${p.cardBorder}`,
                        borderRadius: '6px',
                        fontFamily: MONO,
                        boxShadow: p.cardShadow,
                        transition: 'box-shadow .2s, border-color .2s',
                        '&::before': { ...bracket, top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
                        '&::after': { ...bracket, bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
                        '&:hover': { borderColor: p.accent, boxShadow: p.cardHoverShadow },
                    }}
                >
                    <DeptCardBody c={c} />
                </Box>
            ))}

            {/* Chữ nổi sản lượng ở giữa quả cầu */}
            <Box
                sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(520px, 86%)',
                    textAlign: 'center',
                    zIndex: 200,
                    pointerEvents: 'none',
                }}
            >
                {metric && (
                    <Box key={metric.key} sx={{ animation: 'gpFade .6s ease both' }}>
                        <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: p.accent, textShadow: p.halo }}>
                            SẢN LƯỢNG · {today.format('DD/MM/YYYY')}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: MONO,
                                fontSize: { xs: 13, md: 16 },
                                fontWeight: 700,
                                color: p.centerName,
                                mt: 0.25,
                                textShadow: p.halo,
                            }}
                        >
                            {metric.name}
                        </Typography>
                        <Typography
                            component="div"
                            sx={{
                                fontFamily: MONO,
                                fontWeight: 900,
                                // Theo chiều CAO khung (hero thấp vì cả trang vừa 1 màn hình), không theo bề ngang.
                                fontSize: { xs: 40, md: 'clamp(40px, 7.2vh, 80px)' },
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                color: p.centerBig,
                                animation: 'gpFloat 5s ease-in-out infinite',
                                // Đổ bóng nhiều lớp tạo khối nổi 3D + quầng sáng cam
                                textShadow: p.centerBigShadow,
                            }}
                        >
                            <AnimatedNumber value={metric.cumulative} />
                        </Typography>
                        <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: p.centerLabel, textShadow: p.halo }}>
                            LŨY KẾ
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: MONO,
                                fontSize: { xs: 11, md: 13 },
                                color: p.centerText,
                                mt: 0.5,
                                textShadow: p.halo,
                            }}
                        >
                            Ngày <b style={{ color: p.centerStrong }}>{fmt(metric.day)}</b>
                            {metric.shifts.map((v, i) => (
                                <span key={i} style={{ marginLeft: 12 }}>
                                    Ca {i + 1} <b style={{ color: p.centerShiftStrong }}>{fmt(v)}</b>
                                </span>
                            ))}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 1.25, pointerEvents: 'auto' }}>
                    {metrics.map((m, i) => (
                        <Box
                            key={m.key}
                            role="button"
                            aria-label={m.name}
                            title={m.name}
                            onClick={() => setMetricIdx(i)}
                            sx={{
                                width: i === metricIdx ? 22 : 7,
                                height: 7,
                                borderRadius: 4,
                                cursor: 'pointer',
                                bgcolor: i === metricIdx ? p.accent : p.faint,
                                transition: 'all .25s',
                                '&:hover': { bgcolor: i === metricIdx ? p.accent : p.dotHover },
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* 01 — Tổng quan (góc trên trái) */}
            <Box sx={{ ...hudPanelSx(p), position: 'absolute', top: 14, left: 14, zIndex: 300, p: '10px 14px', minWidth: { xs: 170, md: 230 } }}>
                <PanelTitle no="01">TỔNG QUAN</PanelTitle>
                {[
                    { label: 'Máy', value: machineCount, to: '/machines' },
                    { label: 'Xe', value: vehicleCount, to: '/vehicles' },
                    { label: 'Đơn vị', value: departmentCount, to: '/departments' },
                    { label: 'Nhân viên', value: userCount, to: '/users' },
                ].map((r) => (
                    <Box
                        key={r.label}
                        onClick={() => navigate(r.to)}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 2,
                            py: '2px',
                            cursor: 'pointer',
                            fontSize: 12.5,
                            '&:hover b': { color: p.ink },
                            '&:hover span': { color: p.ink },
                        }}
                    >
                        <span style={{ color: p.soft }}>{r.label}</span>
                        <b style={{ color: p.accent, fontWeight: 800 }}>{Number(r.value || 0).toLocaleString()}</b>
                    </Box>
                ))}
            </Box>

            {/* Nút đổi sáng/tối + đồng hồ (góc trên phải) */}
            <Box
                sx={{
                    ...hudPanelSx(p),
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    zIndex: 300,
                    p: '8px 10px 8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                }}
            >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <HudClock />
                </Box>
                <Tooltip title={p.mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}>
                    <IconButton
                        size="small"
                        onClick={toggle}
                        aria-label={p.mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
                        aria-pressed={p.mode === 'dark'}
                        sx={{
                            color: p.accent,
                            border: `1px solid ${p.accentLine}`,
                            '&:hover': { bgcolor: p.track },
                        }}
                    >
                        {p.mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Chú thích (góc dưới phải) */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    zIndex: 300,
                    textAlign: 'right',
                    display: { xs: 'none', sm: 'block' },
                    ...hudPanelSx(p),
                    p: '8px 14px',
                    border: `1px solid ${p.accentLine}`,
                }}
            >
                <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: p.accent }}>
                    {cards.length} đơn vị · {grandTotal} thiết bị
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: p.muted }}>
                    Rê chuột vào thẻ để dừng quỹ đạo
                </Typography>
            </Box>
        </Box>

        {/* Màn hẹp: thẻ đơn vị xếp thành dải cuộn ngang thay cho quỹ đạo */}
        {isNarrow && cards.length > 0 && (
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    mt: 1,
                    pb: 0.5,
                    scrollSnapType: 'x proximity',
                }}
            >
                {cards.map((c) => (
                    <Box
                        key={c.name}
                        sx={{
                            flex: `0 0 ${CARD_W}px`,
                            scrollSnapAlign: 'start',
                            p: '8px 10px',
                            bgcolor: p.cardSolid,
                            border: `1px solid ${p.cardBorder}`,
                            borderRadius: '6px',
                            fontFamily: MONO,
                        }}
                    >
                        <DeptCardBody c={c} />
                    </Box>
                ))}
            </Box>
        )}
        </>
    );
}
