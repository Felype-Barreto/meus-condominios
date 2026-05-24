import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/demo-experience";

export const metadata: Metadata = {
  title: "Demo Meus Condomínios como morador",
  description: "Experiência fictícia do Meus Condomínios para moradores.",
  robots: { index: false, follow: true },
};

export default function DemoMoradorPage() {
  return <DemoExperience role="morador" />;
}
