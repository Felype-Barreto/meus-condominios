import type { Metadata } from "next";
import { AbuseReportForm } from "./report-form";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Denunciar abuso no Meus Condomínios",
  description: "Canal para denunciar abuso, exposição de dados, assédio, spam ou uso indevido do Meus Condomínios.",
  path: "/denunciar",
});

export default function ReportAbusePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <AbuseReportForm />
    </section>
  );
}
