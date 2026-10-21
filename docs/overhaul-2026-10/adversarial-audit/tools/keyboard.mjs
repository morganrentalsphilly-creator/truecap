import { chromium, DEVICES, shot, save, LIVE } from "./lib.mjs";
const url = process.argv[2] ?? "/";
const label = process.argv[3] ?? "home";
const maxTabs = Number(process.argv[4] ?? 60);
const b = await chromium.launch();
const ctx = await b.newContext({ ...DEVICES.desktop });
const page = await ctx.newPage();
await page.goto(LIVE + url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const stops = [];
for (let i = 0; i < maxTabs; i++) {
  await page.keyboard.press("Tab");
  const s = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Is the element covered at its centre by something else (sticky header, banner)?
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, cx)), Math.max(0, Math.min(innerHeight - 1, cy)));
    const covered = top && !el.contains(top) && !top.contains(el) ? (top.closest("header,[role=dialog],[aria-live],aside,div")?.className?.toString().slice(0, 60) || top.tagName) : null;
    const name = el.getAttribute("aria-label") || el.innerText?.trim().replace(/\s+/g, " ").slice(0, 60) || el.getAttribute("placeholder") || el.value || "";
    return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name, y: Math.round(r.top + scrollY), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, covered, inView: r.top >= 0 && r.bottom <= innerHeight };
  });
  stops.push(s);
  if (i < 14) await shot(page, `kbd-${label}-${String(i).padStart(2, "0")}`, { quality: 50 });
}
const live = await page.evaluate(() => [...document.querySelectorAll("[aria-live],[role=status],[role=alert]")].map((e) => ({ tag: e.tagName, live: e.getAttribute("aria-live"), role: e.getAttribute("role"), text: e.textContent.trim().slice(0, 80) })));
save(`keyboard-${label}`, { url, stops, live });
console.log(stops.map((s, i) => s ? `${i} ${s.tag}${s.role ? "[" + s.role + "]" : ""} "${s.name}" y=${s.y} ${s.outline}${s.covered ? " COVERED by " + s.covered : ""}${s.inView ? "" : " offscreen"}` : `${i} body`).join("\n"));
console.log("live regions", JSON.stringify(live));
await b.close();
