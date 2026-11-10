"use client";

import { PlanGenerationExperience } from "@/components/plan-generation-experience";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const GENERATION_REFRESH_INTERVAL_MS = 3000;

type PlanGeneratingStatusProps = {
  businessName: string;
  weekNumber: number;
  updatedAt: string;
};

export function PlanGeneratingStatus({
  businessName,
  weekNumber,
  updatedAt,
}: PlanGeneratingStatusProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, GENERATION_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [router, updatedAt]);

  return (
    <PlanGenerationExperience
      businessName={businessName}
      context={weekNumber === 1 ? "first-week" : "next-week"}
      state="generating"
      weekNumber={weekNumber}
      autoStart={false}
    />
  );
}
