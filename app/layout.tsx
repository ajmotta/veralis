import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_TITLE = "Veralis — Seu CFO dia e noite";
const SITE_DESCRIPTION =
  "Veralis conecta os números e a operação da escola para mostrar o que mudou, por quê e o que fazer a seguir.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const directHost = requestHeaders.get("host")?.trim();
  const requestedHost = forwardedHost ?? directHost ?? "localhost";
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(requestedHost)
    ? requestedHost
    : "localhost";
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost")
      ? "http"
      : "https";
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title: {
      default: SITE_TITLE,
      template: "%s | Veralis",
    },
    description: SITE_DESCRIPTION,
    applicationName: "Veralis",
    alternates: { canonical: origin },
    category: "financial technology",
    keywords: [
      "gestão financeira escolar",
      "educação infantil",
      "margem operacional",
      "planejamento financeiro escolar",
      "São Paulo",
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: { icon: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Veralis",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: socialImage, width: 1200, height: 630, alt: SITE_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.variable}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Veralis",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              inLanguage: "pt-BR",
              description: SITE_DESCRIPTION,
              offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
              audience: { "@type": "Audience", audienceType: "Gestores de escolas privadas de Educação Infantil" },
            }).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
