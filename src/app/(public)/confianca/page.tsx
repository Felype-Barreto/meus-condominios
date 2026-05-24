import type { Metadata } from "next";
import { SecurityTrustPage } from "@/components/public/security-trust-page";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Segurança e privacidade para condomínios | Meus Condomínios",
  description:
    "Conheça os recursos de segurança do Meus Condomínios: permissões por cargo, QR Code seguro, telefone oculto, logs administrativos e comunicação com consentimento.",
  path: "/confianca",
  keywords: ["confiança Meus Condomínios", "segurança condomínio", "privacidade condomínio"],
});

export default function TrustPage() {
  return <SecurityTrustPage />;
}
