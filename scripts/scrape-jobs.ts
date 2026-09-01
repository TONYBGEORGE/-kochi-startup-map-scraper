// Scrapes https://infopark.in/companies-job (all pages) into data/jobs.json
// Run: npx tsx scripts/scrape-jobs.ts
import * as cheerio from "cheerio";
import { writeFile } from "fs/promises";

const BASE = "https://infopark.in/companies-job";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; kochi-startup-map-bot/1.0)" };

interface Job {
  posted: string;
  title: string;
  company: string;
  lastDate: string;
  link: string | null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.text();
}

function getTotalPages($: cheerio.CheerioAPI): number {
  let max = 1;
  $("a[href*='page=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/page=(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  return max;
}

function parseJobs(html: string): Job[] {
  const $ = cheerio.load(html);
  const rows: Job[] = [];
  const table = $("table").first();

  table.find("tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 4) return;
    const posted = $(tds[0]).text().trim();
    const title = $(tds[1]).text().trim();
    const company = $(tds[2]).text().trim();
    const lastDate = $(tds[3]).text().trim();
    const link = $(tr).find("a[href]").first().attr("href") || null;
    if (title && company) {
      rows.push({ posted, title, company, lastDate, link });
    }
  });

  return rows;
}

async function main() {
  const all: Job[] = [];

  const firstHtml = await fetchHtml(BASE);
  const $ = cheerio.load(firstHtml);
  const totalPages = getTotalPages($);
  console.log(`Detected ${totalPages} pages`);

  for (let page = 1; page <= totalPages; page++) {
    const url = page === 1 ? BASE : `${BASE}?page=${page}`;
    const html = page === 1 ? firstHtml : await fetchHtml(url);
    const rows = parseJobs(html);
    all.push(...rows);
    console.log(`Page ${page}: ${rows.length} jobs (total: ${all.length})`);
    await new Promise((r) => setTimeout(r, 400));
  }

  await writeFile(
    "data/jobs.json",
    JSON.stringify({ scrapedAt: new Date().toISOString(), count: all.length, jobs: all }, null, 2)
  );
  console.log(`Wrote ${all.length} jobs to data/jobs.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
