export type SignupStatus =
  | "account_exists"
  | "account_created"
  | "verification_sent"
  | "error";

type SignupAuthResult = {
  error: {
    code?: string;
    message?: string;
  } | null;
  user: {
    identities?: unknown;
  } | null;
};

const EXISTING_ACCOUNT_PATTERN =
  /(already registered|already exists|user exists|email.*(registered|exists))/i;

export function getSignupStatus(
  result: SignupAuthResult,
): SignupStatus {
  const providerMessage = `${result.error?.code ?? ""} ${result.error?.message ?? ""}`;

  if (result.error && EXISTING_ACCOUNT_PATTERN.test(providerMessage)) {
    return "account_exists";
  }

  if (
    result.user &&
    Array.isArray(result.user.identities) &&
    result.user.identities.length === 0
  ) {
    return "account_exists";
  }

  return result.error ? "error" : "verification_sent";
}
