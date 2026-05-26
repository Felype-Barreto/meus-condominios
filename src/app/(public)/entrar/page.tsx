import { AuthCard } from "@/components/public/auth-card";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="signin" initialNext={params?.next} />;
}
