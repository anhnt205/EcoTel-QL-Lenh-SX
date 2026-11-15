import React, { useMemo, useState } from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import {
    ChevronRight,
    Close as CloseIcon,
    Construction,
    Business as DepartmentIcon,
    DirectionsCar,
    Person2 as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../config/api.config';
import { DeviceTypeEnum, StatusOrderEnum } from '../../enums';
import SummaryCard from './SummaryCard';
import SummaryCardDevice from './SummaryCardDevice';
import DeviceAnalysic from './DeviceAnalysis';
import OrderAnalysic from './OrderAnalysic';
import ProductionAnalysic from './ProductionAnalysic';
import {
    countByStatus,
    fmt,
    MONO,
    STATUS,
    StatusTotals,
    totalOf,
    useDeptCards,
    useProductionMetrics,
} from './overviewShared';
import { hudPanelSx, statusWith, useOverviewTheme } from './overviewTheme';

export const PANEL_ROW_HEIGHT = 190;

type DetailKey = 'fleet' | 'dept' | 'order' | 'production';

const ORDER_ROWS = [
    { key: StatusOrderEnum.PENDING, name: 'Chưa nhận lệnh'},
    { key: StatusOrderEnum.INPROGRESS, name: 'Đã nhận lệnh'},
    { key: StatusOrderEnum.WARNING, name: 'Lỗi'},
    { key: StatusOrderEnum.COMPLETED, name: 'Đã hoàn thành'},
    { key: StatusOrderEnum.CANCEL, name: 'Đã hủy'},
];

// Tên rút gọn các chỉ tiêu sản lượng cho vừa khung bảng.
const SHORT_PRODUCTION: Record<string, string> = {
    KLD: 'Khối lượng đất (m³)',
    TLT: 'Trọng lượng than (tấn)',
    MKS: 'Mét khoan sâu (mks)',
    SLD: 'Vận chuyển than, đất (Tkm)',
    TTK: 'Thể tích khối',
    CD: 'Cung độ',
};

// ───────────────────────── Thành phần nhỏ ─────────────────────────
function Panel({
    no,
    title,
    hint,
    onClick,
    children,
}: {
    no: string;
    title: string;
    hint?: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    const { p } = useOverviewTheme();
    return (
        <Box
            role="button"
            tabIndex={0}
            aria-label={`${title} — bấm để xem chi tiết`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={{
                ...hudPanelSx(p),
                bgcolor: p.panelBg,
                p: '8px 12px 6px',
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color .2s, box-shadow .2s',
                '&:hover, &:focus-visible': {
                    borderColor: p.accent,
                    boxShadow: p.panelHoverShadow,
                },
                '&:hover .more, &:focus-visible .more': { opacity: 1, transform: 'translateX(0)' },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flex: 'none' }}>
                <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.1, color: p.muted, whiteSpace: 'nowrap' }}>
                    <b style={{ color: p.accent, marginRight: 8 }}>{no}</b>
                    {title}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {hint && (
                    <Typography noWrap sx={{ fontFamily: MONO, fontSize: 11, color: p.muted }}>
                        {hint}
                    </Typography>
                )}
                <ChevronRight
                    className="more"
                    sx={{ fontSize: 16, color: p.accent, opacity: 0.35, transform: 'translateX(-3px)', transition: 'all .2s', flex: 'none' }}
                />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
        </Box>
    );
}

/** Thanh nhiều đoạn (tỉ lệ). */
function StackBar({ parts, height = 6 }: { parts: { v: number; color: string }[]; height?: number }) {
    const { p } = useOverviewTheme();
    const sum = parts.reduce((n, p) => n + p.v, 0);
    return (
        <Box sx={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', bgcolor: p.track }}>
            {sum > 0 &&
                parts.map((p, i) =>
                    p.v > 0 ? <Box key={i} sx={{ width: `${(p.v / sum) * 100}%`, bgcolor: p.color }} /> : null,
                )}
        </Box>
    );
}

/** Một dòng kiểu bảng điều khiển: nhãn | thanh | giá trị. */
function BarRow({
    label,
    labelColor,
    bar,
    value,
    sub,
}: {
    label: string;
    labelColor?: string;
    bar: React.ReactNode;
    value: React.ReactNode;
    sub?: React.ReactNode;
}) {
    const { p } = useOverviewTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 23, fontSize: 12 }}>
            <Box sx={{ flex: '0 0 38%', minWidth: 0, color: labelColor ?? p.soft }}>
                <Typography noWrap title={label} sx={{ fontFamily: MONO, fontSize: 12, color: 'inherit' }}>
                    {label}
                </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{bar}</Box>
            <Box sx={{ flex: 'none', minWidth: 34, textAlign: 'right', fontFamily: MONO, fontWeight: 800, color: p.ink }}>{value}</Box>
            {sub !== undefined && (
                <Box sx={{ flex: 'none', minWidth: 58, textAlign: 'right', fontFamily: MONO, fontSize: 11, color: p.muted }}>{sub}</Box>
            )}
        </Box>
    );
}

function FleetBlock({ label, totals }: { label: string; totals: StatusTotals }) {
    const { p } = useOverviewTheme();
    const status = statusWith(STATUS, p);
    const total = totalOf(totals);
    return (
        <Box sx={{ mb: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: p.ink }}>{label}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: p.accent, lineHeight: 1 }}>{total}</Typography>
            </Box>
            <Box sx={{ my: 0.5 }}>
                <StackBar parts={status.map((s) => ({ v: totals[s.key], color: s.color }))} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', fontFamily: MONO, fontSize: 11 }}>
                {status.map((s) => (
                    <Box key={s.key} sx={{ whiteSpace: 'nowrap' }}>
                        <b style={{ color: totals[s.key] > 0 ? s.color : p.faint, fontSize: 13 }}>{totals[s.key]}</b>{' '}
                        <span style={{ color: p.muted, fontSize: 10 }}>{s.short}</span>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// ───────────────────────── Hàng bảng + hộp chi tiết ─────────────────────────
interface Props {
    departments: any[];
    machineDevices: any[];
    vehicleDevices: any[];
    userCount: number;
}

export default function OverviewPanels({ departments, machineDevices, vehicleDevices, userCount }: Props) {
    const { p } = useOverviewTheme();
    const status = statusWith(STATUS, p);
    const [detail, setDetail] = useState<DetailKey | null>(null);

    const { cards } = useDeptCards();
    const { today, metrics } = useProductionMetrics();

    const machineTotals = useMemo(() => countByStatus(machineDevices), [machineDevices]);
    const vehicleTotals = useMemo(() => countByStatus(vehicleDevices), [vehicleDevices]);

    const { data: orderCount = {} } = useQuery({
        queryKey: ['overview-orderCount', today.format('YYYY-MM-DD')],
        queryFn: () =>
            api
                .get('/orders/count_status', { params: { date: today.toISOString(), department: '' } })
                .then((res) => res.data.data),
        refetchInterval: 2 * 60 * 1000,
    });
    const orderDay = (key: string) => Number((orderCount as any)?.[key]?.day ?? 0);
    const orderMax = Math.max(1, ...ORDER_ROWS.map((r) => orderDay(r.key)));

    const topDepts = cards.slice(0, 5);

    const detailTitle: Record<DetailKey, string> = {
        fleet: 'Máy & Xe',
        dept: 'Thiết bị theo đơn vị',
        order: 'Lệnh sản xuất',
        production: 'Sản lượng',
    };

    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
                    height: { lg: PANEL_ROW_HEIGHT },
                }}
            >
                {/* 03 — Máy & Xe */}
                <Panel no="03" title="MÁY & XE" hint={`${machineDevices.length + vehicleDevices.length} thiết bị`} onClick={() => setDetail('fleet')}>
                    <FleetBlock label="Máy" totals={machineTotals} />
                    <FleetBlock label="Xe" totals={vehicleTotals} />
                </Panel>

                {/* 04 — Thiết bị theo đơn vị */}
                <Panel no="04" title="THIẾT BỊ THEO ĐƠN VỊ" hint={`${cards.length} đơn vị`} onClick={() => setDetail('dept')}>
                    {topDepts.map((c) => (
                        <BarRow
                            key={c.name}
                            label={c.name}
                            bar={<StackBar parts={status.map((s) => ({ v: c.totals[s.key], color: s.color }))} />}
                            value={c.total}
                        />
                    ))}
                    {cards.length > topDepts.length && (
                        <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: p.muted, mt: 0.25 }}>
                            + {cards.length - topDepts.length} đơn vị khác
                        </Typography>
                    )}
                </Panel>

                {/* 05 — Lệnh sản xuất */}
                <Panel no="05" title="LỆNH SẢN XUẤT" hint={`Ngày ${today.format('DD/MM')}`} onClick={() => setDetail('order')}>
                    {ORDER_ROWS.map((r, i) => (
                        <BarRow
                            key={r.key}
                            label={r.name}
                            labelColor={p.order[i]}
                            bar={<StackBar parts={[{ v: orderDay(r.key), color: p.order[i] }, { v: orderMax - orderDay(r.key), color: 'transparent' }]} />}
                            value={orderDay(r.key)}
                        />
                    ))}
                </Panel>

                {/* 06 — Sản lượng */}
                <Panel no="06" title="SẢN LƯỢNG · NGÀY / LŨY KẾ" hint={today.format('DD/MM')} onClick={() => setDetail('production')}>
                    {metrics.map((m) => (
                        <BarRow
                            key={m.key}
                            label={SHORT_PRODUCTION[m.key] ?? m.name}
                            bar={<StackBar parts={m.shifts.map((v, i) => ({ v, color: p.shift[i] }))} />}
                            value={fmt(m.day)}
                            sub={fmt(m.cumulative)}
                        />
                    ))}
                </Panel>
            </Box>

            {/* Hộp chi tiết: dùng lại đúng các khối đầy đủ của trang chủ cũ */}
            <Dialog
                open={detail !== null}
                onClose={() => setDetail(null)}
                fullWidth
                maxWidth="xl"
                scroll="paper"
                PaperProps={{ sx: { bgcolor: p.dialogBg, borderRadius: 2, maxHeight: '92vh' } }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.75,
                        bgcolor: p.dialogHeadBg,
                        color: p.dialogHeadColor,
                        borderBottom: `2px solid ${p.accent}`,
                    }}
                >
                    <Typography sx={{ fontFamily: MONO, fontWeight: 800, fontSize: 15, flex: 1 }}>
                        {detail ? detailTitle[detail].toUpperCase() : ''}
                    </Typography>
                    <IconButton size="small" onClick={() => setDetail(null)} aria-label="Đóng" sx={{ color: p.dialogHeadColor }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent sx={{ p: 1.25 }}>
                    {detail === 'fleet' && (
                        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(4, minmax(0,1fr))' } }}>
                            <Box sx={{ gridColumn: { md: 'span 1' } }}>
                                <SummaryCardDevice
                                    title="Thông tin máy"
                                    value={machineDevices.length}
                                    icon={<Construction />}
                                    color="#e4d52cff"
                                    data={machineDevices}
                                    type={DeviceTypeEnum.MACHINE}
                                />
                            </Box>
                            <Box>
                                <SummaryCardDevice
                                    title="Thông tin xe"
                                    value={vehicleDevices.length}
                                    icon={<DirectionsCar />}
                                    color="#f34f21ff"
                                    data={vehicleDevices}
                                    type={DeviceTypeEnum.VEHICLE}
                                />
                            </Box>
                            <SummaryCard title="Đơn vị" value={departments.length} icon={<DepartmentIcon />} color="#4caf50" type="department" />
                            <SummaryCard title="Nhân viên" value={userCount} icon={<PersonIcon />} color="#2196f3" type="user" />
                        </Box>
                    )}
                    {detail === 'dept' && <DeviceAnalysic departments={departments} />}
                    {detail === 'order' && <OrderAnalysic departments={departments} />}
                    {detail === 'production' && <ProductionAnalysic departments={departments} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
