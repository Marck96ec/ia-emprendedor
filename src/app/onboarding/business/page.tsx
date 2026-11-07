import { redirect } from "next/navigation";

import { createBusiness } from "@/actions/business";
import { ConversationalOnboarding } from "@/components/conversational-onboarding";
import { createClient } from "@/lib/supabase/server";

type BusinessOnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function BusinessOnboardingPage({
  searchParams,
}: BusinessOnboardingPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  // Si ya tiene negocio, no tiene sentido repetir onboarding.
  if (business) {
    redirect("/dashboard");
  }

  return (
    <ConversationalOnboarding
      mode="business"
      action={createBusiness}
      error={error}
    />
  );
}