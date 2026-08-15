import { createReadStream, mkdirSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, resolve } from "node:path";
import { chromium } from "playwright";

const reelDir = resolve(process.cwd(), "output/playwright/oshicart-reels");
const previewDir = resolve(reelDir, "previews");
mkdirSync(previewDir, { recursive: true });

const server = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname.slice(1));
  const filePath = resolve(reelDir, basename(name));
  const size = statSync(filePath).size;
  const range = request.headers.range;
  if (range) {
    const [startText, endText] = range.replace("bytes=", "").split("-");
    const start = Number(startText);
    const end = endText ? Number(endText) : size - 1;
    response.writeHead(206, {
      "Content-Type": "video/webm",
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    });
    createReadStream(filePath, { start, end }).pipe(response);
  } else {
    response.writeHead(200, { "Content-Type": "video/webm", "Content-Length": size, "Accept-Ranges": "bytes" });
    createReadStream(filePath).pipe(response);
  }
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const port = server.address().port;

const browser = await chromium.launch({ headless: true });
const results = [];

for (const name of readdirSync(reelDir).filter((file) => /^\d{2}-.+\.webm$/.test(file)).sort()) {
  const filePath = resolve(reelDir, name);
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  const source = `http://127.0.0.1:${port}/${encodeURIComponent(name)}`;
  await page.setContent(`<style>html,body{margin:0;background:#0b1220}video{display:block;width:540px;height:960px;object-fit:contain}</style><video muted src="${source}"></video>`);
  const metadata = await page.locator("video").evaluate((video) => new Promise((resolveMetadata, reject) => {
    const ready = () => resolveMetadata({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    if (video.readyState >= 1) return ready();
    video.addEventListener("loadedmetadata", ready, { once: true });
    video.addEventListener("error", () => reject(new Error("Video metadata failed to load")), { once: true });
  }));
  await page.locator("video").evaluate((video, time) => new Promise((resolveSeek) => {
    video.currentTime = time;
    video.addEventListener("seeked", resolveSeek, { once: true });
  }), Math.max(1, metadata.duration * 0.55));
  await page.locator("video").screenshot({ path: resolve(previewDir, name.replace(/\.webm$/, ".png")) });
  results.push({ name, bytes: statSync(filePath).size, ...metadata });
  await page.close();
}

await browser.close();
await new Promise((resolveClose) => server.close(resolveClose));
console.log(JSON.stringify(results, null, 2));
