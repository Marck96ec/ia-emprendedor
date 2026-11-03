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
      captureSchema={captureSchema}
      onCancel={() => window.history.back()}
      onSubmit={(data) => {
        const formData = new FormData();
        formData.set("action_id", actionId);
        formData.set("completion_data", JSON.stringify(data));
        void updateWeeklyActionStatus(formData);
      }}
    />
  );
}
