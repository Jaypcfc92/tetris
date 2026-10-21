/**
 * Runtime smoke test: boots the production build in headless Chrome,
 * starts a game, plays a few moves and captures screenshots.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.APP_URL ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--mute-audio", "--window-size=1280,960"],
});

const errors = [];
const page = await browser.newPage();
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.setViewport({ width: 1280, height: 960 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("canvas", { timeout: 20000 });
console.log("canvas: present");

await page.screenshot({ path: "smoke-start.png" });

// Start the game.
const startButton = await page.waitForFunction(
  () => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "START",
    );
    return button ?? null;
  },
  { timeout: 10000 },
);
await startButton.asElement()?.click();
await new Promise((resolve) => setTimeout(resolve, 400));

// Play a handful of classic moves.
for (const key of ["ArrowLeft", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
  await page.keyboard.press(key);
  await new Promise((resolve) => setTimeout(resolve, 60));
}
await page.keyboard.down("Space");
await page.keyboard.up("Space");
await new Promise((resolve) => setTimeout(resolve, 500));
// Hold + second drop.
await page.keyboard.press("KeyC");
await page.keyboard.press("Space");
await new Promise((resolve) => setTimeout(resolve, 700));

const state = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  return {
    scoreText: [...document.querySelectorAll("p")]
      .map((p) => p.textContent)
      .find((text) => /^\d[\d,.]*$/.test(text ?? "")),
    hasCanvas: Boolean(canvas),
    canvasSize: canvas ? `${canvas.width}x${canvas.height}` : "none",
  };
});
console.log("state:", JSON.stringify(state));

await page.screenshot({ path: "smoke-playing.png" });

// Pause overlay.
await page.keyboard.press("KeyP");
await new Promise((resolve) => setTimeout(resolve, 300));
const pausedVisible = await page.evaluate(() =>
  [...document.querySelectorAll("p")].some((p) => p.textContent?.trim() === "PAUSED"),
);
console.log("pause overlay:", pausedVisible ? "shown" : "MISSING");
await page.screenshot({ path: "smoke-paused.png" });
await page.keyboard.press("KeyP");

// Queue previews rendered?
const previews = await page.evaluate(
  () => document.querySelectorAll('[role="img"][aria-label$="piece"]').length,
);
console.log("next previews:", previews);

// Force a game over: keep hard-dropping until the dialog appears.
let gameOverShown = false;
for (let i = 0; i < 80 && !gameOverShown; i += 1) {
  await page.keyboard.press("Space");
  await new Promise((resolve) => setTimeout(resolve, 120));
  gameOverShown = await page.evaluate(() =>
    [...document.querySelectorAll("h2")].some((h) => h.textContent?.includes("GAME OVER")),
  );
}
console.log("game over dialog:", gameOverShown ? "shown" : "MISSING");
await page.screenshot({ path: "smoke-gameover.png" });

if (gameOverShown) {
  // High score persisted to localStorage?
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("neon-tetris-highscores"),
  );
  console.log("highscores persisted:", stored !== null && stored.includes('"entries"'));
  // Restart via the dialog button.
  const restarted = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "PLAY AGAIN",
    );
    button?.click();
    return Boolean(button);
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const playingAgain = await page.evaluate(() =>
    [...document.querySelectorAll("p")].every((p) => p.textContent?.trim() !== "GAME OVER"),
  );
  console.log("restart via dialog:", restarted && playingAgain ? "ok" : "FAILED");
}

// Mobile viewport check.
const mobile = await browser.newPage();
mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await mobile.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await mobile.waitForSelector("canvas", { timeout: 20000 });
await new Promise((resolve) => setTimeout(resolve, 500));
await mobile.screenshot({ path: "smoke-mobile.png", fullPage: false });

console.log(errors.length === 0 ? "NO RUNTIME ERRORS" : `ERRORS:\n${errors.join("\n")}`);
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
