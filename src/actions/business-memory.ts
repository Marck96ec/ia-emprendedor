"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AvailabilitySchema, OperationalResourceSchema, resourceLabels } from "@/lib/business-memory";
import { createClient } from "@/lib/supabase/server";

const StatementSchema = z.object({
  resource: OperationalResourceSchema,
  availability: AvailabilitySchema,
  detail: z.string().trim().max(400),
});

export async function saveBusinessResource(formData: FormData) {
  const parsed = StatementSchema.safeParse({
    resource: formData.get("resource"),
    availability: formData.get("availability"),
    detail: formData.get("detail") ?? "",
  });
  if (!parsed.success) redirect("/business-context?status=invalid");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) redirect("/login");

  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id").eq("owner_id", auth.claims.sub).maybeSingle();
  if (businessError || !business) redirect("/business-context?status=error");

  const { resource, availability, detail } = parsed.data;
  const category = availability === "unavailable" ? "constraint"
    : availability === "unknown" ? "fact" : resource === "delegate" ? "capability" : "asset";
  const { error } = await supabase.rpc("record_business_memory", {
    p_business_id: business.id,
    p_memory_key: resource,
    p_category: category,
    p_content: { label: resourceLabels[resource], availability, detail },
    p_confirmation: "declared",
  });
  if (error) redirect("/business-context?status=error");

  revalidatePath("/dashboard");
  revalidatePath("/business-context");
  redirect("/business-context?status=saved");
}

