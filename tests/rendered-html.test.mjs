import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readOptionalDirectory(url) {
  try {
    return await readdir(url);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return [];
    throw error;
  }
}

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Veralis home in pt-BR", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang=["']pt-BR["']/i);
  assert.match(html, /<title>Veralis — Seu CFO dia e noite<\/title>/i);
  assert.match(html, /Verdade antes de resposta/);
  assert.match(html, /Seu CFO/);
  assert.match(html, /Explorar demonstração/);
  assert.match(html, /Escola Horizonte/);
  assert.match(html, /Entrar/);
  assert.match(html, /property="og:image" content="http:\/\/localhost\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /name="twitter:image" content="http:\/\/localhost\/og\.png"/i);
  assert.match(html, /rel="canonical" href="http:\/\/localhost"/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /SoftwareApplication/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps the public demo synthetic, accessible, and resettable", async () => {
  const experience = await readFile(
    new URL("../app/veralis-experience.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(experience, /Ambiente de demonstração/);
  assert.match(experience, /Não envie informações pessoais ou financeiras reais/);
  assert.match(experience, /Reset demo/);
  assert.match(experience, /Abrir menu/);
  assert.match(experience, /Performance/);
  assert.match(experience, /Plano de ação/);
  assert.match(experience, /Benchmark experimental baseado em escolas sintéticas comparáveis/);
  assert.match(experience, /Subir arquivos para avaliar/);
  assert.match(experience, /Selecionar vários arquivos da escola/);
  assert.match(experience, /dados identificáveis permitidos/);
  assert.match(experience, /Eles ainda não alimentam automaticamente o CFO/);
  assert.match(experience, /Nada é salvo em servidor/);
  assert.match(experience, /Áudio ainda não disponível/);
  assert.match(experience, /fetch\("\/api\/analyze"/);
  assert.match(experience, /OpenAI · resposta verificada/);
  assert.match(experience, /fallback seguro/);
  assert.match(experience, /Novo contexto aplicado ao diagnóstico/);
  assert.match(experience, /Bridge reconciliada/);
  assert.match(experience, /Ver cálculo/);
  assert.match(experience, /Ver evidências/);
  assert.match(experience, /aria-live="polite"/);
  assert.match(experience, /event\.key === "Enter"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /button:focus-visible/);
  assert.match(css, /@media \(max-width:\s*620px\)/);
});

test("serves crawl controls without indexing private or API routes", async () => {
  const [robots, sitemap] = await Promise.all([render("/robots.txt"), render("/sitemap.xml")]);
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Disallow: \/private/);
  assert.match(robotsText, /Disallow: \/api\//);
  assert.match(robotsText, /Sitemap: http:\/\/localhost\/sitemap\.xml/);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<loc>http:\/\/localhost\/<\/loc>/);
});

test("removes the disposable starter experience", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|_sites-preview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.deepEqual(await readOptionalDirectory(new URL("app/_sites-preview", projectRoot)), []);
});
