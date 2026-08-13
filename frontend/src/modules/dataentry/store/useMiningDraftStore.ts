import { create } from "zustand";
import type {
  MiningSessionDraft,
  TripRow,
} from "@/modules/dataentry/components/MiningBatchEntryModal.tsx";
import { validateMiningSession } from "@/modules/dataentry/schemas/thong-ke.schema.ts";

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const newTripRow = (defaultMaterial = ""): TripRow => ({
  _tempId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  vehicleNo: "",
  tripCount: "",
  material: defaultMaterial,
  loadStatus: "Đủ tải",
  loadStatusNote: "",
  vehicleManagementUnit: "",
  vehicleType: "",
});

export const createDefaultSession = (): MiningSessionDraft => ({
  _tempId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  workingDate: todayStr(),
  shift: "",
  department: "",
  pickupLocation: "",
  excavator: "",
  totalScoops: "",
  trips: [newTripRow("")],
  initialFuel: "",
  receivedFuel: "",
  finalFuel: "",
  operatorBadgeNo: "",
  operatorName: "",
  operatorUnit: "",
});

interface MiningDraftStore {
  sessions: MiningSessionDraft[];
  activeIdx: number;

  initDrafts: () => void;
  addSession: () => void;
  removeSession: (idx: number) => void;
  setActiveIdx: (idx: number) => void;
  updateActiveSession: (
    patch: Partial<MiningSessionDraft>,
    getOperatorDetails?: (badgeNo: string) => { operatorName: string; operatorUnit: string }
  ) => void;
  updateTripRow: (
    tIdx: number,
    patch: Partial<TripRow>,
    getVehicleDetails?: (vehicleNo: string) => { vehicleManagementUnit: string; vehicleType: string }
  ) => void;
  addTripRow: () => void;
  removeTripRow: (tIdx: number) => boolean;
  loadSessionForEdit: (draft: MiningSessionDraft) => void;
  loadSessionsForEdit: (drafts: MiningSessionDraft[]) => void;
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


export const useMiningDraftStore = create<MiningDraftStore>((set, get) => ({
  sessions: [createDefaultSession()],
  activeIdx: 0,

  initDrafts: () => {
    set({
      sessions: [createDefaultSession()],
      activeIdx: 0,
    });
  },

  addSession: () => {
    const { sessions } = get();
    // Copy base header info from previous session for UX convenience
    const prev = sessions[sessions.length - 1];
    const newSess = createDefaultSession();
    if (prev) {
      newSess.workingDate = prev.workingDate;
      newSess.shift = prev.shift;
      newSess.pickupLocation = prev.pickupLocation;
    }

    set({
      sessions: [...sessions, newSess],
      activeIdx: sessions.length,
    });
  },

  removeSession: (idx: number) => {
    const { sessions, activeIdx } = get();
    if (sessions.length <= 1) {
      set({
        sessions: [createDefaultSession()],
        activeIdx: 0,
      });
      return;
    }

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

  updateActiveSession: (patch, getOperatorDetails) => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return;

    const next = [...sessions];
    const updated = { ...next[activeIdx], ...patch };

    if ("operatorBadgeNo" in patch && getOperatorDetails && patch.operatorBadgeNo) {
      const info = getOperatorDetails(patch.operatorBadgeNo);
      updated.operatorName = info.operatorName;
      updated.operatorUnit = info.operatorUnit;
    }

    next[activeIdx] = updated;
    set({ sessions: next });
  },

  updateTripRow: (tIdx, patch, getVehicleDetails) => {
    const { sessions, activeIdx } = get();
    if (!sessions[activeIdx]) return;

    const currentSess = sessions[activeIdx];
    const trips = [...currentSess.trips];
    if (!trips[tIdx]) return;

    const updatedTrip = { ...trips[tIdx], ...patch };
    if ("vehicleNo" in patch && getVehicleDetails && patch.vehicleNo) {
      const info = getVehicleDetails(patch.vehicleNo);
      updatedTrip.vehicleManagementUnit = info.vehicleManagementUnit;
      updatedTrip.vehicleType = info.vehicleType;
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
      trips: [...currentSess.trips, newTripRow("")],
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

  loadSessionForEdit: (draft: MiningSessionDraft) => {
    set({
      sessions: [draft],
      activeIdx: 0,
    });
  },

  loadSessionsForEdit: (drafts: MiningSessionDraft[]) => {
    set({
      sessions: drafts.length > 0 ? drafts : [createDefaultSession()],
      activeIdx: 0,
    });
  },

  validateAllSessions: () => {
    const { sessions } = get();
    for (let i = 0; i < sessions.length; i++) {
      const validation = validateMiningSession(sessions[i], i);
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
    return validateMiningSession(sess, idx).success;
  },

  getSessionProgress: (idx: number) => {
    const { sessions } = get();
    const sess = sessions[idx];
    if (!sess) return 0;

    let points = 0;
    const total = 9;

    if (String(sess.workingDate ?? "").trim()) points++;
    if (String(sess.shift ?? "").trim()) points++;
    if (String(sess.pickupLocation ?? "").trim()) points++;
    if (String(sess.excavator ?? "").trim()) points++;
    if (sess.totalScoops !== "" && Number(sess.totalScoops) > 0) points++;
    if (sess.initialFuel !== "" && Number(sess.initialFuel) >= 0) points++;
    if (sess.receivedFuel !== "" && Number(sess.receivedFuel) >= 0) points++;
    if (sess.finalFuel !== "" && Number(sess.finalFuel) >= 0) points++;
    if (String(sess.operatorBadgeNo ?? "").trim()) points++;

    const tripRatio =
      sess.trips.length > 0
        ? sess.trips.filter((t) => {
            const hasVehicle = Boolean(String(t.vehicleNo ?? "").trim());
            const hasMaterial = Boolean(String(t.material ?? "").trim());
            const hasValidTripCount = Number(t.tripCount) >= 1;
            let hasValidNote = true;
            if (t.loadStatus === "Khác") {
              const note = String(t.loadStatusNote ?? "").trim().replace(/\s+/g, "");
              hasValidNote = Boolean(note) && /^\d+\/[1-9]\d*$/.test(note);
            }
            return hasVehicle && hasMaterial && hasValidTripCount && hasValidNote;
          }).length / sess.trips.length
        : 0;

    const basePercent = Math.round((points / total) * 80);
    const tripPercent = Math.round(tripRatio * 20);

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

