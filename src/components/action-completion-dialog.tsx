"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  DynamicActionCompletionForm,
  type ActionCompletionAction,
} from "@/components/dynamic-action-completion-form";
import type { ActionCapture } from "@/lib/action-capture";

type ActionCompletionDialogProps = {
  open: boolean;
  onClose: () => void;
  actionId: string;
  captureSchema: ActionCapture;
  action: ActionCompletionAction;
  initialData?: Record<string, unknown>;
  readOnly: boolean;
};

export function ActionCompletionDialog({
  open,
  onClose,
  actionId,
  captureSchema,
  action,
  initialData,
  readOnly,
}: ActionCompletionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // El foco va al primer control utilizable, no al contenedor desplazable.
      dialog.querySelector<HTMLElement>(
        "input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)",
      )?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Mientras se guarda no se cierra: el usuario debe ver el resultado del envío.
  function requestClose() {
    if (!pending) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
      className="m-0 mt-auto max-h-dvh w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 open:flex open:flex-col sm:m-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl"
    >
      {open && (
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-6 sm:pt-6">
          <p className="eyebrow mb-3">Resultado de la acción</p>
          <DynamicActionCompletionForm
            captureSchema={captureSchema}
            actionId={actionId}
            action={action}
            initialData={initialData}
            readOnly={readOnly}
            titleId={titleId}
            onCancel={requestClose}
            onPendingChange={setPending}
          />
        </div>
      )}
    </dialog>
  );
}
