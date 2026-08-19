import type { Metadata } from "next";
import Link from "next/link";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";

export const metadata: Metadata = {
  title: "Área privada",
  description: "Área privada da Veralis para análises com dados autorizados.",
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default async function PrivatePage() {
  const user = await requireChatGPTUser("/private");

  return (
    <main className="private-shell">
      <div className="private-card">
        <span className="private-kicker">ÁREA PRIVADA</span>
        <h1>Olá, {user.displayName}.</h1>
        <p>
          Seu acesso foi confirmado pelo ChatGPT. O modo privado está separado
          da demonstração pública e não mantém documentos neste dispositivo.
        </p>
        <div className="private-actions">
          <Link href="/">Abrir demonstração</Link>
          <a href={chatGPTSignOutPath("/")}>Sair</a>
        </div>
      </div>
    </main>
  );
}
