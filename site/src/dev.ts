import { existsSync, statSync, watch } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { build } from "./build";

const siteRoot = resolve(import.meta.dir, "..");
const outDir = join(siteRoot, "dist");
const port = Number(process.env.PORT ?? 4321);
const clients = new Set<ReadableStreamDefaultController<string>>();
const bootId = crypto.randomUUID();
// Reloads after a content rebuild, or when `bun --watch` restarts this server with a new boot id.
const devScript = `<script>{let boot;new EventSource("/__reload").onmessage=({data})=>{if(data==="reload"||(boot&&data!==boot))location.reload();boot??=data}}</script>`;

async function rebuild(reason: string) {
  try {
    const started = performance.now();
    await build({ outDir, devScript });
    console.log(`${reason}: rebuilt in ${Math.round(performance.now() - started)} ms`);
    for (const client of clients) client.enqueue("data: reload\n\n");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
}

await rebuild("start");

let timer: Timer | undefined;
for (const dir of ["content", "public", "src/client", "src/styles.css"]) {
  watch(join(siteRoot, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(`changed ${dir}`), 80);
  });
}

Bun.serve({
  port,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/__reload") {
      let controller: ReadableStreamDefaultController<string>;
      return new Response(
        new ReadableStream<string>({
          start: (c) => {
            clients.add((controller = c));
            c.enqueue(`data: ${bootId}\n\n`);
          },
          cancel: () => void clients.delete(controller),
        }),
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
      );
    }
    let file = normalize(join(outDir, decodeURIComponent(pathname)));
    if (!file.startsWith(outDir)) return new Response("Forbidden", { status: 403 });
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (existsSync(file)) return new Response(Bun.file(file));
    return new Response(Bun.file(join(outDir, "404.html")), { status: 404, headers: { "Content-Type": "text/html" } });
  },
});

console.log(`Docs at http://localhost:${port}/`);
