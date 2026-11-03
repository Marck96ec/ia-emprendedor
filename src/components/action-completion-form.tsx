"use client";

import { updateWeeklyActionStatus } from "@/actions/weekly-actions";
import { DynamicActionCompletionForm } from "@/components/dynamic-action-completion-form";
import type { ActionCapture } from "@/lib/action-capture";

export function ActionCompletionForm({
  actionId,
  captureSchema,
}: {
  actionId: string;
  captureSchema: ActionCapture;
}) {
  return (
    <DynamicActionCompletionForm
      actionId={actionId}
      captureSchema={captureSchema}
      action={updateWeeklyActionStatus}
    />
  );
}
