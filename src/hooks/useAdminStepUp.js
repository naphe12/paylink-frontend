import { useRef, useState } from "react";

import api from "@/services/api";

function isStepUpRequired(err) {
  return err?.status === 428 && err?.detail?.code === "admin_step_up_required";
}

export default function useAdminStepUp() {
  const executeRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [status, setStatus] = useState({ enabled: false, token_expires_in_seconds: 0 });

  const close = () => {
    setOpen(false);
    setLoading(false);
    setError("");
    setAction("");
    setActionLabel("");
    executeRef.current = null;
  };

  const runWithStepUp = async ({ action: actionName, actionLabel: label, execute }) => {
    try {
      return await execute(null);
    } catch (err) {
      if (!isStepUpRequired(err)) {
        throw err;
      }
      executeRef.current = execute;
      setAction(actionName || "");
      setActionLabel(label || "Confirmer l'action admin");
      setError("");
      setOpen(true);
      return null;
    }
  };

  const confirm = async (password) => {
    if (!executeRef.current) return;
    setLoading(true);
    setError("");
    try {
      const payload = await api.issueAdminStepUp({
        password,
        action: action || null,
      });
      const token = payload?.token;
      if (!token) {
        throw new Error("Jeton step-up admin manquant.");
      }
      await executeRef.current(token);
      close();
    } catch (err) {
      setError(err?.message || "Confirmation admin impossible.");
      setLoading(false);
    }
  };

  return {
    stepUpOpen: open,
    stepUpLoading: loading,
    stepUpError: error,
    stepUpActionLabel: actionLabel,
    closeStepUp: close,
    confirmStepUp: confirm,
    runWithStepUp,
    stepUpStatus: status,
    loadStepUpStatus: async () => {
      try {
        const payload = await api.getAdminStepUpStatus();
        setStatus(payload || { enabled: false, token_expires_in_seconds: 0 });
      } catch {
        setStatus({ enabled: false, token_expires_in_seconds: 0 });
      }
    },
  };
}
