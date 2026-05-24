import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/demo-experience";

export const metadata: Metadata = {
  title: "Demo Meus Condomínios como guarita",
  description: "Experiência fictícia do Meus Condomínios para guarita, cancela e portaria.",
  robots: { index: false, follow: true },
};

export default function DemoGuaritaPage() {
  return <DemoExperience role="guarita" />;
}
