import { PasswordResetCard } from "@/components/public/password-reset-card";

export const metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha para acessar o Meus Condomínios.",
};

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl items-center px-4 py-12">
      <PasswordResetCard />
    </section>
  );
}
