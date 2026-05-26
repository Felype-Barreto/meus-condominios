import { AuthCard } from "@/components/public/auth-card";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="signup" initialNext={params?.next} />;
}
