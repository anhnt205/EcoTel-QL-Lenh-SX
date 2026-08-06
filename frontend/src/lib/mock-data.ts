import type { InitDataResponse, StatisticRow } from '@/modules/dataentry/types/statistic.types';
import type { UserInfo } from '@/modules/auth/types/auth.types';

// Mock users
export const MOCK_USERS: UserInfo[] = [
  { id: '1', hoTen: 'Nguyễn Văn Admin', username: 'admin', role: 'admin', trangThai: 'active', ngayTao: '2024-01-01' },
  { id: '2', hoTen: 'Trần Thị Nhập Liệu', username: 'nhaplieu', role: 'nhap_lieu', trangThai: 'active', ngayTao: '2024-02-01' },
  { id: '3', hoTen: 'Lê Văn Báo Cáo', username: 'baocao', role: 'bao_cao', trangThai: 'active', ngayTao: '2024-03-01' },
];

// Mock init data cho statistics
export const MOCK_INIT_DATA: InitDataResponse = {
  shifts: [
    { _id: 's1', name: 'Ca 1', startTime: '06:00', endTime: '14:00' },
    { _id: 's2', name: 'Ca 2', startTime: '14:00', endTime: '22:00' },
    { _id: 's3', name: 'Ca 3', startTime: '22:00', endTime: '06:00' },
  ],
  trucks: [
    { _id: 't1', code: '29H-001', group: 'Xe', source: 'INTERNAL', quality: 'A', capacity: 40, department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    { _id: 't2', code: '29H-002', group: 'Xe', source: 'INTERNAL', quality: 'B', capacity: 35, department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    { _id: 't3', code: '29H-003', group: 'Xe', source: 'INTERNAL', quality: 'A', capacity: 40, department: { _id: 'd2', code: 'Đ2', name: 'Đội 2' } },
    { _id: 't4', code: 'LC-001', group: 'Xe', source: 'OUTSOURCED', quality: 'B', capacity: 30, department: { _id: 'd3', code: 'NT', name: 'Thuê ngoài' } },
    { _id: 't5', code: 'LC-002', group: 'Xe', source: 'OUTSOURCED', quality: 'A', capacity: 35, department: { _id: 'd3', code: 'NT', name: 'Thuê ngoài' } },
  ],
  excavators: [
    { _id: 'e1', code: 'PC200-1', group: 'Máy', source: 'INTERNAL' },
    { _id: 'e2', code: 'PC300-1', group: 'Máy', source: 'INTERNAL' },
    { _id: 'e3', code: 'PC200-2', group: 'Máy', source: 'INTERNAL' },
  ],
  locations: [
    { _id: 'l1', name: 'Mo A - Vị trí 1', symbol: 'MA1', type: 'LOADING' },
    { _id: 'l2', name: 'Mo A - Vị trí 2', symbol: 'MA2', type: 'LOADING' },
    { _id: 'l3', name: 'Mo B - Vị trí 1', symbol: 'MB1', type: 'LOADING' },
    { _id: 'l4', name: 'Bãi đổ 1', symbol: 'BD1', type: 'DUMPING' },
    { _id: 'l5', name: 'Bãi đổ 2', symbol: 'BD2', type: 'DUMPING' },
    { _id: 'l6', name: 'Bãi than', symbol: 'BT', type: 'DUMPING' },
  ],
  materials: [
    { _id: 'm1', name: 'Đất thường', symbol: 'dd', acceptedProduct: 'Đất' },
    { _id: 'm2', name: 'Đá nổ', symbol: 'dn', acceptedProduct: 'Đá' },
    { _id: 'm3', name: 'Than', symbol: 'th', acceptedProduct: 'Than' },
    { _id: 'm4', name: 'Đất bùn', symbol: 'db', acceptedProduct: 'Đất' },
  ],
  users: [
    { _id: 'u1', fullName: 'Nguyễn Văn A', salaryCode: 'NV001', department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    { _id: 'u2', fullName: 'Trần Văn B', salaryCode: 'NV002', department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    { _id: 'u3', fullName: 'Lê Văn C', salaryCode: 'NV003', department: { _id: 'd2', code: 'Đ2', name: 'Đội 2' } },
    { _id: 'u4', fullName: 'Phạm Văn D', salaryCode: 'NV004', department: { _id: 'd2', code: 'Đ2', name: 'Đội 2' } },
    { _id: 'u5', fullName: 'Hoàng Văn E', salaryCode: 'CB001', department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
  ],
};

// Mock statistics rows
export const MOCK_STATISTICS_ROWS: StatisticRow[] = [
  {
    _id: 'r1', workingDate: '2026-07-23', shift: { _id: 's1', name: 'Ca 1' },
    device: { _id: 't1', code: '29H-001', quality: 'A', capacity: 40, department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    driver: { _id: 'u1', fullName: 'Nguyễn Văn A', salaryCode: 'NV001', department: { _id: 'd1', code: 'Đ1' } },
    staff: { _id: 'u5', fullName: 'Hoàng Văn E', salaryCode: 'CB001' },
    excavator: { _id: 'e1', code: 'PC200-1' },
    fromLocation: { _id: 'l1', symbol: 'MA1', name: 'Mo A - Vị trí 1' },
    toLocation: { _id: 'l4', symbol: 'BD1', name: 'Bãi đổ 1' },
    material: { _id: 'm1', name: 'Đất thường', symbol: 'dd' },
    loadingModel: 'd', quantity: 12, totalTon: 0, underload: 0,
    ton: 480, cubicMeter: 480, production: 5760,
    loadingHeight: 3, tripTimes: ['06:15', '06:45', '07:20', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    vehicleSource: 'INTERNAL', initialGas: 200, additionalGas: 0, finalGas: 120,
    createdAt: '2026-07-23T06:00:00Z', updatedAt: '2026-07-23T06:00:00Z',
  },
  {
    _id: 'r2', workingDate: '2026-07-23', shift: { _id: 's1', name: 'Ca 1' },
    device: { _id: 't2', code: '29H-002', quality: 'B', capacity: 35, department: { _id: 'd1', code: 'Đ1', name: 'Đội 1' } },
    driver: { _id: 'u2', fullName: 'Trần Văn B', salaryCode: 'NV002', department: { _id: 'd1', code: 'Đ1' } },
    staff: { _id: 'u5', fullName: 'Hoàng Văn E', salaryCode: 'CB001' },
    excavator: { _id: 'e2', code: 'PC300-1' },
    fromLocation: { _id: 'l2', symbol: 'MA2', name: 'Mo A - Vị trí 2' },
    toLocation: { _id: 'l5', symbol: 'BD2', name: 'Bãi đổ 2' },
    material: { _id: 'm2', name: 'Đá nổ', symbol: 'dn' },
    loadingModel: 'r', quantity: 8, totalTon: 200, underload: 5,
    ton: 200, cubicMeter: 184.8, production: 2217.6,
    loadingHeight: 2, tripTimes: ['06:30', '07:15', '08:00', '08:45', '09:30', '10:15', '11:00', '11:45'],
    vehicleSource: 'INTERNAL', initialGas: 180, additionalGas: 50, finalGas: 100,
    createdAt: '2026-07-23T06:00:00Z', updatedAt: '2026-07-23T06:00:00Z',
  },
  {
    _id: 'r3', workingDate: '2026-07-23', shift: { _id: 's2', name: 'Ca 2' },
    device: { _id: 't3', code: '29H-003', quality: 'A', capacity: 40, department: { _id: 'd2', code: 'Đ2', name: 'Đội 2' } },
    driver: { _id: 'u3', fullName: 'Lê Văn C', salaryCode: 'NV003', department: { _id: 'd2', code: 'Đ2' } },
    excavator: { _id: 'e1', code: 'PC200-1' },
    fromLocation: { _id: 'l3', symbol: 'MB1', name: 'Mo B - Vị trí 1' },
    toLocation: { _id: 'l6', symbol: 'BT', name: 'Bãi than' },
    material: { _id: 'm3', name: 'Than', symbol: 'th' },
    loadingModel: 'd', quantity: 15, totalTon: 0, underload: 0,
    ton: 600, cubicMeter: 600, production: 7200,
    loadingHeight: 4, tripTimes: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    vehicleSource: 'INTERNAL', initialGas: 250, additionalGas: 0, finalGas: 80,
    createdAt: '2026-07-23T14:00:00Z', updatedAt: '2026-07-23T14:00:00Z',
  },
  {
    _id: 'r4', workingDate: '2026-07-22', shift: { _id: 's1', name: 'Ca 1' },
    device: { _id: 't4', code: 'LC-001', quality: 'B', capacity: 30, department: { _id: 'd3', code: 'NT', name: 'Thuê ngoài' } },
    driver: { _id: 'u4', fullName: 'Phạm Văn D', salaryCode: 'NV004', department: { _id: 'd3', code: 'NT' } },
    excavator: { _id: 'e3', code: 'PC200-2' },
    fromLocation: { _id: 'l1', symbol: 'MA1', name: 'Mo A - Vị trí 1' },
    toLocation: { _id: 'l4', symbol: 'BD1', name: 'Bãi đổ 1' },
    material: { _id: 'm1', name: 'Đất thường', symbol: 'dd' },
    loadingModel: 'd', quantity: 10, totalTon: 0, underload: 0,
    ton: 300, cubicMeter: 300, production: 3600,
    loadingHeight: 2, tripTimes: ['06:00', '06:40', '07:20', '08:00', '08:40', '09:20', '10:00', '10:40', '11:20', '12:00'],
    vehicleSource: 'OUTSOURCED', initialGas: 0, additionalGas: 0, finalGas: 0,
    createdAt: '2026-07-22T06:00:00Z', updatedAt: '2026-07-22T06:00:00Z',
  },
];
