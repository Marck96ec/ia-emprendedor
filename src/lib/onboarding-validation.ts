import { z } from "zod";

const requiredInteger = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum));

const requiredRevenue = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite().min(0));

export const BusinessOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1500),
  revenue_model: z.string().trim().min(10).max(1000),
});

export const DiagnosticOnboardingSchema = z.object({
  business_stage: z.enum(["starting", "operating", "growing", "stalled"]),
  team_size: requiredInteger(1, 10000),
  owner_hours_per_week: requiredInteger(0, 168),
  main_challenge: z.string().trim().min(10).max(1000),
  primary_goal: z.string().trim().min(10).max(1000),
  customers_description: z.string().trim().min(10).max(1000),
  sales_process: z.string().trim().min(10).max(1500),
  owner_responsibilities: z.string().trim().min(10).max(1500),
  monthly_revenue: requiredRevenue,
  currency_code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
});

export type BusinessOnboardingInput = z.infer<typeof BusinessOnboardingSchema>;
export type DiagnosticOnboardingInput = z.infer<typeof DiagnosticOnboardingSchema>;