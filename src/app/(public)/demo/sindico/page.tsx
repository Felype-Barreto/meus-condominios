import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/demo-experience";

export const metadata: Metadata = {
  title: "Demo Meus Condomínios como síndico",
  description: "Experiência fictícia do Meus Condomínios para síndicos e administradores.",
  robots: { index: false, follow: true },
};

export default function DemoSindicoPage() {
  return <DemoExperience role="sindico" />;
}
