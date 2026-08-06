import React from "react";
import type { RoleType } from "@/modules/dataentry/types/thong-ke.ts";
import { TransportHeaderDetailModal } from "./TransportHeaderDetailModal.tsx";
import { MiningBatchEntryModal } from "./MiningBatchEntryModal.tsx";

interface BatchEntryModalProps {
  role: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchEntryModal: React.FC<BatchEntryModalProps> = ({
  role,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (role === "ROLE_TRANSPORT") {
    return (
      <TransportHeaderDetailModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <MiningBatchEntryModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};
