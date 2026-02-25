import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_PAGE =
    "https://dineoncampus.com/barryu/whats-on-the-menu/roussell-dining-hall";
const PERIODS = ["breakfast", "lunch", "dinner"];

function todayET() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

function toNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

function pickNutrient(item, name) {
    const hit = (item.nutrients || []).find(
        (n) => (n.name || "").toLowerCase() === name.toLowerCase()
    );
    return hit ? toNumber(hit.valueNumeric ?? hit.value) : null;
}

function normalizeMenu(raw, period) {
    const cats = raw?.period?.categories || [];
    return cats.map((c) => ({
        station: c.name || "Unknown",
        sortOrder: c.sortOrder ?? 999,
        items: (c.items || []).map((it) => {
            const calories = toNumber(it.calories) ?? pickNutrient(it, "Calories");
            const protein = pickNutrient(it, "Protein (g)");
            const carbs = pickNutrient(it, "Total Carbohydrates (g)");
            const fat = pickNutrient(it, "Total Fat (g)");

            const allZero = [calories, protein, carbs, fat].every((v) => v === 0);

            return {
                id: it.id,
                name: (it.name || "").trim(),
                portion: it.portion || null,
                ingredients: it.ingredients || null,
                calories: allZero ? null : calories,
                macros: {
                    protein_g: allZero ? null : protein,
                    carbs_g: allZero ? null : carbs,
                    fat_g: allZero ? null : fat,
                },
                allergens: (it.customAllergens || []).map(String),
                tags: (it.filters || []).map(String),
            };
        }),
    }));
}

async function captureMenuJson(page, dateStr, period) {
    let captured = null;
    const seen = new Set();

    page.on("response", async (res) => {
        try {
            const u = res.url();
            if (
                u.includes("apiv4.dineoncampus.com") &&
                u.includes("/menu?") &&
                u.includes(`date=${dateStr}`)
            ) {
                if (!seen.has(u)) {
                    seen.add(u);
                    console.log(`[${period}] saw ${res.status()} ${u}`);
                }
                if (res.status() === 200) {
                    const ct = (res.headers()["content-type"] || "").toLowerCase();
                    if (ct.includes("application/json")) captured = await res.json();
                }
            }
        } catch { }
    });

    return { get: () => captured, seenCount: () => seen.size };
}

async function scrapeOne(dateStr, period) {
    const url = `${BASE_PAGE}/${dateStr}/${period}`;

    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const context = await browser.newContext({
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
    });
    const page = await context.newPage();

    const cap = await captureMenuJson(page, dateStr, period);

    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });

    for (let i = 0; i < 60 && !cap.get(); i++) await sleep(500);

    const raw = cap.get();
    await browser.close();

    if (!raw) {
        throw new Error(
            `Failed to capture menu JSON for ${period} on ${dateStr}. Seen menu calls: ${cap.seenCount()}`
        );
    }
    return raw;
}

async function main() {
    const dateStr = process.env.DATE || todayET();
    const outDir = path.join("public", "menu", dateStr);
    ensureDir(outDir);

    for (const period of PERIODS) {
        const raw = await scrapeOne(dateStr, period);

        fs.writeFileSync(
            path.join(outDir, `raw-${period}.json`),
            JSON.stringify(raw, null, 2)
        );

        const clean = normalizeMenu(raw, period);
        fs.writeFileSync(
            path.join(outDir, `${period}.json`),
            JSON.stringify(
                { date: dateStr, period, hall: "Roussell Dining Hall", stations: clean },
                null,
                2
            )
        );

        console.log(`Saved ${period}.json + raw-${period}.json`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});