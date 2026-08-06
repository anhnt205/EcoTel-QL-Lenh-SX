import { create } from 'zustand';
import type { BatchViewMode, TransportRecord, MiningRecord, RoleType } from '@/modules/dataentry/types/thong-ke';
import { lookupVehicleInfo, lookupOperatorInfo } from '../utils/lookup';

export type DraftRecord = Partial<TransportRecord> & Partial<MiningRecord> & { _tempId: string };

interface BatchEntryState {
  viewMode: BatchViewMode;
  setViewMode: (mode: BatchViewMode) => void;
  drafts: DraftRecord[];
  columnVisibility: Record<string, boolean>;
  
  // Actions
  setDrafts: (drafts: DraftRecord[]) => void;
  initEmptyDrafts: (role: RoleType, count?: number) => void;
  addDraft: (role: RoleType) => void;
  duplicateDraft: (index: number) => void;
  removeDraft: (index: number) => void;
  updateDraftCell: (index: number, field: string, value: any) => void;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  toggleColumn: (columnKey: string) => void;
  resetDrafts: () => void;
}

const createDefaultDraft = (role: RoleType): DraftRecord => {
  const now = new Date();
  const base: DraftRecord = {
    _tempId: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    month: now.getMonth() + 1,
    day: now.getDate(),
    shift: '1',
    vehicleNo: '473',
    tripCount: 5,
    cargoType: 'Than',
    fleet: 'PXVT1',
  };

  if (role === 'ROLE_TRANSPORT') {
    return {
      ...base,
      excavationArea: 'CS P15',
      excavatorEquipment: 'U6',
      pickupLocation: '11.ĐCS',
      unloadLocationName: 'BangNau',
      fullRouteDistance: 5.5,
      fullRouteElevate: 100,
      initialFuel: 1000,
      receivedFuel: 500,
      finalFuel: 1200,
    };
  }

  // Tự động điền dữ liệu mặc định chuẩn cho Bên Khai Thác
  const vehicleInfo = lookupVehicleInfo('473');
  const operatorInfo = lookupOperatorInfo('TL001');

  const initialFuel = 300;
  const receivedFuel = 150;
  const finalFuel = 100;
  const fuelConsumption = initialFuel + receivedFuel - finalFuel;
  const fuelNorm = 380;
  const fuelDiff = fuelNorm - fuelConsumption;

  return {
    ...base,
    miningUnit: 'PXKT 1',
    mineCode: 'MX-01 (EKG-5A)',
    excavationBench: 'Tầng +15',
    pickupLocation: 'Mỏ Cao Sơn - Moong 1',
    dumpLocation: 'Bãi thải Nam',
    material: 'Đất đá',
    loadStatus: 'Đủ tải',
    tempVolume: 45.0,
    tempWeight: 90.0,
    vehicleManagementUnit: vehicleInfo.vehicleManagementUnit,
    vehicleType: vehicleInfo.vehicleType,
    initialFuel,
    receivedFuel,
    finalFuel,
    fuelConsumption,
    fuelNorm,
    fuelDiff,
    operatorBadgeNo: 'TL001',
    operatorName: operatorInfo.operatorName,
    operatorUnit: operatorInfo.operatorUnit,
    category: 'Đất SX',
  };
};

export const useBatchEntryStore = create<BatchEntryState>((set) => ({
  viewMode: 'compact',
  setViewMode: (mode) => set({ viewMode: mode }),
  drafts: [],
  columnVisibility: {},

  setDrafts: (drafts) => set({ drafts }),
  
  initEmptyDrafts: (role, count = 3) => {
    const initial: DraftRecord[] = Array.from({ length: count }, () => createDefaultDraft(role));
    set({ drafts: initial });
  },

  addDraft: (role) =>
    set((state) => ({
      drafts: [...state.drafts, createDefaultDraft(role)],
    })),

  duplicateDraft: (index) =>
    set((state) => {
      const source = state.drafts[index];
      if (!source) return state;
      const duplicated: DraftRecord = {
        ...source,
        _tempId: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      };
      const newDrafts = [...state.drafts];
      newDrafts.splice(index + 1, 0, duplicated);
      return { drafts: newDrafts };
    }),

  removeDraft: (index) =>
    set((state) => ({
      drafts: state.drafts.filter((_, i) => i !== index),
    })),

  updateDraftCell: (index, field, value) =>
    set((state) => {
      const newDrafts = [...state.drafts];
      if (!newDrafts[index]) return state;

      const updatedRow = { ...newDrafts[index], [field]: value };

      // 1. Tra cứu tự động khi thay đổi Số xe
      if (field === 'vehicleNo' && typeof value === 'string') {
        const vehicleInfo = lookupVehicleInfo(value);
        updatedRow.vehicleManagementUnit = vehicleInfo.vehicleManagementUnit;
        updatedRow.vehicleType = vehicleInfo.vehicleType;
      }

      // 2. Tra cứu tự động khi thay đổi Số thẻ lương
      if (field === 'operatorBadgeNo' && typeof value === 'string') {
        const operatorInfo = lookupOperatorInfo(value);
        updatedRow.operatorName = operatorInfo.operatorName;
        updatedRow.operatorUnit = operatorInfo.operatorUnit;
      }

      // 3. Tự động tính Nhiên liệu tiêu thụ & Tiết kiệm/Vượt định mức
      if (
        field === 'initialFuel' ||
        field === 'receivedFuel' ||
        field === 'finalFuel' ||
        field === 'fuelNorm'
      ) {
        const init = Number(updatedRow.initialFuel) || 0;
        const rec = Number(updatedRow.receivedFuel) || 0;
        const fin = Number(updatedRow.finalFuel) || 0;
        const norm = Number(updatedRow.fuelNorm) || 0;

        const cons = init + rec - fin;
        updatedRow.fuelConsumption = cons >= 0 ? cons : 0;
        updatedRow.fuelDiff = norm - (updatedRow.fuelConsumption || 0);
      }

      newDrafts[index] = updatedRow;
      return { drafts: newDrafts };
    }),

  setColumnVisibility: (visibility) => set({ columnVisibility: visibility }),
  
  toggleColumn: (columnKey) =>
    set((state) => ({
      columnVisibility: {
        ...state.columnVisibility,
        [columnKey]: state.columnVisibility[columnKey] === false ? true : false,
      },
    })),

  resetDrafts: () => set({ drafts: [] }),
}));
