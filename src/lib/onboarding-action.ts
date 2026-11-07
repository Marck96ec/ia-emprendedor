export type OnboardingActionResult =
  | { success: true }
  | { success: false; message: string };

export type OnboardingAction = (
  formData: FormData,
) => Promise<OnboardingActionResult>;
