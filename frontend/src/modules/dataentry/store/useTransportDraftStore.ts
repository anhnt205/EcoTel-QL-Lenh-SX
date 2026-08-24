import { create } from "zustand";
import type {
  TransportSessionDraft,
  TransportTripRow,
} from "@/modules/dataentry/components/TransportHeaderDetailModal.tsx";
import { validateTransportSession } from "@/modules/dataentry/schemas/thong-ke.schema.ts";

// ponytail: vehicle info lives at session level, trip row stays minimal
export const newTransportTripRow = (): TransportTripRow => ({
  _tempId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  excavationArea: "",
  excavatorEquipment: "",
  pickupLocation: "",
  pickupBench: "",
  pickupBenchGroup: "",
  unloadBench: "",
  fullRouteDistance: "",
  fullRouteElevate: "",
  localSlopeDist: "",
  localSlopeDegree: "",
  unloadLocationName: "",
  cargoType: "",
  cargoGroup: "",
  tripCount: "",
  loadStatus: "Đủ tải",
  loadStatusNote: "",
  isRainyDay: false,
  isTraineeVehicle: false,
});

interface TransportDraftStore {
  sessions: TransportSessionDraft[];
  activeIdx: number;

  initDrafts: (defaultSession: TransportSessionDraft) => void;
  addSession: (defaultSession: TransportSessionDraft) => void;
  removeSession: (idx: number) => void;
  setActiveIdx: (idx: number) => void;
  updateActiveSession: (
    patch: Partial<TransportSessionDraft>,
    getOperatorDetails?: (badgeNo: string) => { operatorName: string; operatorUnit: string },
    getVehicleDetails?: (vehicleNo: string) => { vehicleManagementUnit: string; vehicleType: string }
  ) => void;
  updateTripRow: (
    tIdx: number,
    patch: Partial<TransportTripRow>,
    getCargoGroupDetails?: (cargoType: string) => string
  ) => void;
  addTripRow: () => void;
  removeTripRow: (tIdx: number) => boolean;
  loadSessionForEdit: (draft: TransportSessionDraft) => void;
  loadSessionsForEdit: (drafts: TransportSessionDraft[]) => void;
  validateAllSessions: () => {
    isValid: boolean;
    firstErrorMsg?: string;
    firstErrorIdx?: number;
  };
  isSessionValid: (idx: number) => boolean;
  getSessionProgress: (idx: number) => number;
  getBatchProgress: () => {
    validCount: number;
    totalCount: number;
    overallPercent: number;
  };
}

export const useTransportDraftStore = create<TransportDraftStore>((set, get) => ({
  sessions: [],
  activeIdx: 0,

  initDrafts: (defaultSession: TransportSessionDraft) => {
    set({
      sessions: [defaultSession],
      activeIdx: 0,
    });
  },

  addSession: (defaultSession: TransportSessionDraft) => {
    const { sessions } = get();
    const prev = sessions[sessions.length - 1];
    const newSess = { ...defaultSession, _tempId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    if (prev) {
      newSess.workingDate = prev.workingDate;
      newSess.shift = prev.shift;
      newSess.vehicleNo = prev.vehicleNo;
      newSess.equipmentUnit = prev.equipmentUnit;
      newSess.vehicleType = prev.vehicleType;
    }

    set({
      sessions: [...sessions, newSess],
      activeIdx: sessions.length,
    });
  },

  removeSession: (idx: number) => {
    const { sessions, activeIdx } = get();
    if (sessions.length <= 1) return;

    const nextSessions = sessions.filter((_, i) => i !== idx);
    const nextIdx = Math.min(activeIdx, nextSessions.length - 1);
    set({
      sessions: nextSessions,
      activeIdx: nextIdx,
    });
  },

  setActiveIdx: (idx: number) => {
    set({ activeIdx: idx });
  },

  updateActiveSession: (patch, getOperatorDetails, getVehicleDetails) => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return;

    const next = [...sessions];
    const updated = { ...next[activeIdx], ...patch };

    if ("operatorBadgeNo" in patch && getOperatorDetails && patch.operatorBadgeNo) {
      const info = getOperatorDetails(patch.operatorBadgeNo);
      updated.operatorName = info.operatorName;
      updated.operatorUnit = info.operatorUnit;
    }

    if ("vehicleNo" in patch && getVehicleDetails && patch.vehicleNo) {
      const info = getVehicleDetails(patch.vehicleNo);
      updated.equipmentUnit = info.vehicleManagementUnit;
      updated.vehicleType = info.vehicleType;
    }

    next[activeIdx] = updated;
    set({ sessions: next });
  },

  updateTripRow: (tIdx, patch, getCargoGroupDetails) => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return;

    const currentSess = sessions[activeIdx];
    const trips = [...currentSess.trips];
    if (!trips[tIdx]) return;

    const updatedTrip = { ...trips[tIdx], ...patch };

    if ("cargoType" in patch && getCargoGroupDetails && patch.cargoType) {
      const groupName = getCargoGroupDetails(patch.cargoType);
      if (groupName) {
        updatedTrip.cargoGroup = groupName;
      }
    }

    trips[tIdx] = updatedTrip;

    const next = [...sessions];
    next[activeIdx] = { ...currentSess, trips };
    set({ sessions: next });
  },

  addTripRow: () => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return;

    const currentSess = sessions[activeIdx];
    const next = [...sessions];
    next[activeIdx] = {
      ...currentSess,
      trips: [...currentSess.trips, newTransportTripRow()],
    };
    set({ sessions: next });
  },

  removeTripRow: (tIdx: number) => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return false;

    const currentSess = sessions[activeIdx];
    if (currentSess.trips.length <= 1) {
      return false; // Cannot remove last trip
    }

    const next = [...sessions];
    next[activeIdx] = {
      ...currentSess,
      trips: currentSess.trips.filter((_, i) => i !== tIdx),
    };
    set({ sessions: next });
    return true;
  },

  loadSessionForEdit: (draft: TransportSessionDraft) => {
    set({
      sessions: [draft],
      activeIdx: 0,
    });
  },

  loadSessionsForEdit: (drafts: TransportSessionDraft[]) => {
    set({
      sessions: drafts.length > 0 ? drafts : [],
      activeIdx: 0,
    });
  },

  validateAllSessions: () => {
    const { sessions } = get();
    for (let i = 0; i < sessions.length; i++) {
      const validation = validateTransportSession(sessions[i], i);
      if (!validation.success) {
        return {
          isValid: false,
          firstErrorMsg: validation.errorMsg,
          firstErrorIdx: i,
        };
      }
    }
    return { isValid: true };
  },

  isSessionValid: (idx: number) => {
    const { sessions } = get();
    const sess = sessions[idx];
    if (!sess) return false;
    return validateTransportSession(sess, idx).success;
  },

  getSessionProgress: (idx: number) => {
    const { sessions } = get();
    const sess = sessions[idx];
    if (!sess) return 0;

    let points = 0;
    const total = 4;

    if (String(sess.workingDate ?? "").trim()) points++;
    if (String(sess.shift ?? "").trim()) points++;
    if (String(sess.vehicleNo ?? "").trim()) points++;
    if (String(sess.operatorBadgeNo ?? "").trim()) points++;

    const tripRatio =
      sess.trips.length > 0
        ? sess.trips.filter(
            (t) =>
              String(t.cargoType ?? "").trim() &&
              Number(t.tripCount) >= 1 &&
              String(t.excavationArea ?? "").trim() &&
              String(t.unloadLocationName ?? "").trim()
          ).length / sess.trips.length
        : 0;

    const basePercent = Math.round((points / total) * 60);
    const tripPercent = Math.round(tripRatio * 40);

    return Math.min(100, basePercent + tripPercent);
  },

  getBatchProgress: () => {
    const { sessions, isSessionValid } = get();
    const totalCount = sessions.length;
    let validCount = 0;
    let sumProgress = 0;

    sessions.forEach((_, i) => {
      if (isSessionValid(i)) validCount++;
      sumProgress += get().getSessionProgress(i);
    });

    const overallPercent =
      totalCount > 0 ? Math.round(sumProgress / totalCount) : 0;

    return { validCount, totalCount, overallPercent };
  },
}));
