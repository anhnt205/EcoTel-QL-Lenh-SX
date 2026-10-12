import React from "react";
import type { RoleType } from "@/modules/dataentry/types/thong-ke.ts";
import { TransportHeaderDetailModal } from "./TransportHeaderDetailModal.tsx";
import { MiningBatchEntryModal } from "./MiningBatchEntryModal.tsx";

interface BatchEntryModalProps {
  role: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "add" | "edit";
}

export const BatchEntryModal: React.FC<BatchEntryModalProps> = ({
  role,
  isOpen,
  onClose,
  onSuccess,
  mode = "add",
}) => {
  if (role === "ROLE_TRANSPORT") {
    return (
      <TransportHeaderDetailModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        mode={mode}
      />
    );
  }

  return (
    <MiningBatchEntryModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      mode={mode}
    />
  );
};
