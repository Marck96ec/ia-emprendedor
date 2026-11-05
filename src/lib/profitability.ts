import { z } from "zod";

export const ProfitabilityInputSchema = z.object({
  salePrice: z.number().finite().nonnegative(),
  materialsCost: z.number().finite().nonnegative().optional(),
  laborCost: z.number().finite().nonnegative().optional(),
  indirectCost: z.number().finite().nonnegative().optional(),
  hours: z.number().finite().positive().optional(),
  currencyCode: z.string().trim().min(1).optional(),
  estimated: z.boolean().default(true),
});

export type ProfitabilityInput = z.input<typeof ProfitabilityInputSchema>;

export type ProfitabilityResult = {
  salePrice: number;
  totalCost: number;
  estimatedProfit: number;
  marginPercent: number;
  profitPerHour: number | null;
  currencyCode: string | null;
  certainty: "real" | "estimated";
  missing: Array<"materialsCost" | "laborCost" | "indirectCost" | "hours">;
};

export function calculateProfitability(
  input: ProfitabilityInput,
): ProfitabilityResult {
  const parsed = ProfitabilityInputSchema.parse(input);
  const missing = [
    parsed.materialsCost === undefined ? "materialsCost" : null,
    parsed.laborCost === undefined ? "laborCost" : null,
    parsed.indirectCost === undefined ? "indirectCost" : null,
    parsed.hours === undefined ? "hours" : null,
  ].filter((value): value is ProfitabilityResult["missing"][number] => value !== null);
  const totalCost =
    (parsed.materialsCost ?? 0) +
    (parsed.laborCost ?? 0) +
    (parsed.indirectCost ?? 0);
  const estimatedProfit = parsed.salePrice - totalCost;

  return {
    salePrice: parsed.salePrice,
    totalCost,
    estimatedProfit,
    marginPercent: parsed.salePrice === 0
      ? 0
      : (estimatedProfit / parsed.salePrice) * 100,
    profitPerHour: parsed.hours === undefined
      ? null
      : estimatedProfit / parsed.hours,
    currencyCode: parsed.currencyCode ?? null,
    certainty: parsed.estimated ? "estimated" : "real",
    missing,
  };
}
