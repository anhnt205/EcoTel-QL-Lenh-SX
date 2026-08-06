import * as XLSX from 'xlsx';
import type { RoleType } from '@/modules/dataentry/types/thong-ke';

// Standard column headers for Transport Template & Export
export const TRANSPORT_EXCEL_HEADERS = [
  'THANG',
  'Ngày',
  'Ca',
  'So xe',
  'Số chuyến',
  'Chủng loại hàng',
  'Đội xe',
  'Khu xúc',
  'Máy xúc, Thiết bị máy',
  'Nơi nhận tải (via)',
  'Tăng nhận',
  'Tổng dỡ',
  'CĐ toàn tuyến (K...)',
  'Nâng tải toàn tuyến',
  'CĐ dốc cục bộ (K...)',
  'Dốc cục bộ (t...)',
  'Tên gọi nơi dỡ tải',
  'Roda',
  'Trừ với đất',
  'NL Tồn',
  'Linh',
  'Tồn',
];

// Standard column headers for Mining Template & Export (Sheet NHAP SO)
export const MINING_EXCEL_HEADERS = [
  'Tháng',
  'Ngày',
  'Ca',
  'Mã MX',
  'Số xe',
  'Chuyến',
  'Loại',
  'Chủng loại',
  'Đội xe',
  'mã C/T',
  'Vị trí đổ',
  'Hàng_Đất',
  'Hàng_Than',
  'Loại xe-PXVT',
  'Công ty',
  'Mã',
  'Loại Hàng',
  'Hàng',
  'Đủ tải/Roda',
];

// Sample demo rows for template
const SAMPLE_TRANSPORT_ROWS = [
  {
    THANG: 5,
    Ngày: 2,
    Ca: 1,
    'So xe': '473',
    'Số chuyến': 6,
    'Chủng loại hàng': 'Nomin',
    'Đội xe': 'PXVT1',
    'Khu xúc': 'CS P15',
    'Máy xúc, Thiết bị máy': 'U6',
    'Nơi nhận tải (via)': '11.ĐCS',
    'Tăng nhận': -80,
    'Tổng dỡ': 300,
    'CĐ toàn tuyến (K...)': 8.8,
    'Nâng tải toàn tuyến': 380,
    'CĐ dốc cục bộ (K...)': 4.95,
    'Dốc cục bộ (t...)': 5,
    'Tên gọi nơi dỡ tải': 'BangNau',
    Roda: 'dutai',
    'Trừ với đất': 0,
    'NL Tồn': 1188,
    Linh: 800,
    Tồn: 590,
  },
];

const SAMPLE_MINING_ROWS = [
  {
    Tháng: 5,
    Ngày: 2,
    Ca: 1,
    'Mã MX': 'p9',
    'Số xe': '99',
    Chuyến: 5,
    Loại: 'Đất SX',
    'Chủng loại': 'Nomin',
    'Đội xe': 'PXVT5',
    'mã C/T': 'CT01',
    'Vị trí đổ': 'Bãi thải 1',
    Hàng_Đất: 'Đất SX',
    Hàng_Than: '',
    'Loại xe-PXVT': 'CAT773E_B_VT5',
    'Công ty': 'Cao Sơn',
    Mã: 'A.Đất',
    'Loại Hàng': '1.Đất hệ số',
    Hàng: 'Đất SX',
    'Đủ tải/Roda': 'dutai',
  },
];

export const excelService = {
  // 1. Tải file Excel mẫu cho từng vai trò
  generateTemplate: (role: RoleType) => {
    const headers = role === 'ROLE_TRANSPORT' ? TRANSPORT_EXCEL_HEADERS : MINING_EXCEL_HEADERS;
    const sampleRows = role === 'ROLE_TRANSPORT' ? SAMPLE_TRANSPORT_ROWS : SAMPLE_MINING_ROWS;
    const sheetName = role === 'ROLE_TRANSPORT' ? 'Vận Tải' : 'NHAP SO';
    const fileName = role === 'ROLE_TRANSPORT' ? 'Mau_Import_VanTai.xlsx' : 'Mau_Import_KhaiThac.xlsx';

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, fileName);
  },

  // 2. Parse file Excel được tải lên từ phía Client
  parseExcelFile: (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Tìm sheet "NHAP SO" hoặc Sheet1
          let targetSheetName = workbook.SheetNames[0];
          if (workbook.SheetNames.includes('NHAP SO')) {
            targetSheetName = 'NHAP SO';
          } else if (workbook.SheetNames.includes('Vận Tải')) {
            targetSheetName = 'Vận Tải';
          }

          const worksheet = workbook.Sheets[targetSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  // 3. Export mảng dữ liệu ra file Excel
  exportToExcel: (data: any[], fileName: string, sheetName: string = 'Data') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
};
