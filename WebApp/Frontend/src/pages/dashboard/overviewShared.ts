// Hằng số, hàm và hook dùng chung cho quả cầu 3D (OverviewGlobe) và hàng bảng bên dưới (OverviewPanels).
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../config/api.config';
import { StatusDeviceEnum } from '../../enums';
import { filter as EXCLUDED_DEPARTMENT_NAMES } from './DeviceAnalysis';
import { productions } from './ProductionAnalysic';

export const MONO = "'JetBrains Mono','Cascadia Mono','SFMono-Regular',Consolas,'Liberation Mono',monospace";

export const STATUS = [
    { key: StatusDeviceEnum.AVAILABLE, label: 'Chờ điều động', short: 'Chờ' },
    { key: StatusDeviceEnum.IN_USE, label: 'Đang hoạt động', short: 'Hoạt động' },
    { key: StatusDeviceEnum.MAINTENANCE, label: 'SC; BD', short: 'SC;BD' },
    { key: StatusDeviceEnum.RETIRED, label: 'Niêm cất', short: 'Niêm cất' },
];

export type StatusTotals = Record<string, number>;

export const emptyTotals = (): StatusTotals => ({
    [StatusDeviceEnum.AVAILABLE]: 0,
    [StatusDeviceEnum.IN_USE]: 0,
    [StatusDeviceEnum.MAINTENANCE]: 0,
    [StatusDeviceEnum.RETIRED]: 0,
});

export const sumStatus = (group: any): StatusTotals => {
    const acc = emptyTotals();
    (group?.deviceTypes ?? []).forEach((t: any) => {
        STATUS.forEach((s) => {
            acc[s.key] += t.statusCounts?.[s.key] || 0;
        });
    });
    return acc;
};

/** Đếm theo trạng thái từ danh sách từng thiết bị. */
export const countByStatus = (devices: any[]): StatusTotals => {
    const acc = emptyTotals();
    devices.forEach((d) => {
        if (d?.status in acc) acc[d.status] += 1;
    });
    return acc;
};

export const totalOf = (t: StatusTotals) => STATUS.reduce((n, s) => n + (t[s.key] || 0), 0);

// Màu đèn LED của đơn vị: cùng quy tắc với bảng "Thiết bị theo đơn vị".
export const ledOf = (t: StatusTotals, colors: readonly string[]) =>
    t[StatusDeviceEnum.MAINTENANCE] > 0
        ? colors[2]
        : t[StatusDeviceEnum.IN_USE] > 0
            ? colors[1]
            : t[StatusDeviceEnum.AVAILABLE] > 0
                ? colors[0]
                : colors[3];

export const fmt = (n: number) => Number(Number(n || 0).toFixed(1)).toLocaleString();


export interface DeptCardData {
    name: string;
    totals: StatusTotals;
    total: number;
}

/** Thiết bị theo đơn vị (cùng queryKey/URL với bảng "Thiết bị theo đơn vị" nên dùng chung cache). */
export function useDeptCards() {
    const { data: deviceCount = [] } = useQuery({
        queryKey: ['deviceCount', ''],
        queryFn: () => api.get(`/devices/count/status?department=`).then((res) => res.data.data),
    });

    const groups = useMemo(
        () => (deviceCount as any[]).filter((g) => !EXCLUDED_DEPARTMENT_NAMES.includes(g?.departmentName)),
        [deviceCount],
    );

    const cards: DeptCardData[] = useMemo(
        () =>
            groups
                .map((g) => {
                    const totals = sumStatus(g);
                    return { name: String(g.departmentName ?? ''), totals, total: totalOf(totals) };
                })
                .filter((c) => c.name && c.total > 0)
                .sort((a, b) => b.total - a.total),
        [groups],
    );

    const grand = useMemo(() => {
        const acc = emptyTotals();
        groups.forEach((g) => {
            const t = sumStatus(g);
            STATUS.forEach((s) => (acc[s.key] += t[s.key]));
        });
        return acc;
    }, [groups]);

    return { cards, grand, grandTotal: totalOf(grand) };
}

export interface ProductionMetric {
    key: string;
    name: string;
    day: number;
    cumulative: number;
    shifts: number[];
}

/** Sản lượng ngày hôm nay, tất cả đơn vị (dùng chung queryKey với bảng "Sản lượng"). */
export function useProductionMetrics() {
    const today = useMemo(() => dayjs(), []);
    const dayKey = today.format('YYYY-MM-DD');
    const fetchAnalysis = (path: string) => async () => {
        const res = await api.get(`/analysics/${path}?date=${today.toISOString()}&department=`);
        return res.data.data || [];
    };
    const { data: vhk = [] } = useQuery({
        queryKey: ['analysicsVHK', '', dayKey],
        queryFn: fetchAnalysis('vhk'),
        refetchInterval: 2 * 60 * 1000,
    });
    const { data: vhx = [] } = useQuery({
        queryKey: ['analysicsVHX', '', dayKey],
        queryFn: fetchAnalysis('vhx'),
        refetchInterval: 2 * 60 * 1000,
    });
    const { data: tkm = [] } = useQuery({
        queryKey: ['analysicsVHXE', '', dayKey],
        queryFn: fetchAnalysis('tkm'),
        refetchInterval: 2 * 60 * 1000,
    });

    const metrics: ProductionMetric[] = useMemo(() => {
        const all = [vhk, vhx, tkm].flatMap((d: any) => (Array.isArray(d) ? d : []));
        return productions.map((p) => {
            const row = all.find((r: any) => r.jobType === p.key);
            const shift = (n: number) => row?.selectedDay?.shifts?.find((s: any) => s.shift === n)?.production || 0;
            return {
                key: p.key,
                name: p.name,
                day: row?.selectedDay?.dayTotal || 0,
                cumulative: row?.cumulativeTotal || 0,
                shifts: [shift(1), shift(2), shift(3)],
            };
        });
    }, [vhk, vhx, tkm]);

    return { today, metrics };
}
