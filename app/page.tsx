import type { Metadata } from "next";
import { VeralisExperience } from "./veralis-experience";

export const metadata: Metadata = {
  description:
    "Entenda o que mudou nos números da sua escola, por quê e o que fazer a seguir.",
};

export default function Home() {
  return <VeralisExperience />;
}
