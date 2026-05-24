import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";
import { SecurityIncidentReportForm } from "./report-form";

export const metadata: Metadata = createSeoMetadata({
  title: "Reportar falha ou incidente de seguranca | Meus Condomínios",
  description:
    "Canal para reportar suspeita de vazamento, abuso, acesso indevido, spam no WhatsApp ou uso indevido do QR publico no Meus Condomínios.",
  path: "/seguranca/reportar",
});

export default function ReportSecurityIncidentPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <SecurityIncidentReportForm />
    </section>
  );
}
