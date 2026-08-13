import { useEffect, useRef } from "react";

interface UseModalShortcutsProps {
  isOpen: boolean;
  mode: "add" | "edit";
  onAddTrip: () => void;
  onSave: (isSaveAndNew: boolean) => void;
}

export function useModalShortcuts({
  isOpen,
  mode,
  onAddTrip,
  onSave,
}: UseModalShortcutsProps) {
  // Use a ref to always have access to the latest handlers and mode
  // without needing to re-bind the event listener when they change.
  const handlersRef = useRef({ onAddTrip, onSave, mode });

  useEffect(() => {
    handlersRef.current = { onAddTrip, onSave, mode };
  }, [onAddTrip, onSave, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      const { onAddTrip, onSave, mode } = handlersRef.current;
      
      if (e.key === "F3") {
        e.preventDefault();
        onAddTrip();
      }
      if (e.key === "F2" && mode === "add") {
        e.preventDefault();
        onSave(true);
      }
      if (e.key === "F5") {
        e.preventDefault();
        onSave(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);
}
