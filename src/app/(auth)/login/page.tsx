import { ProgressiveLoginForm } from "@/components/progressive-login-form";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="ambient-shell flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        <ProgressiveLoginForm initialError={error} initialMessage={message} />
      </div>
    </main>
  );
}