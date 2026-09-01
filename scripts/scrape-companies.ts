// Scrapes https://infopark.in/companies (all pages) into data/companies.json
// Run: npx tsx scripts/scrape-companies.ts
import * as cheerio from "cheerio";
import { writeFile } from "fs/promises";

const BASE = "https://infopark.in/companies";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; kochi-startup-map-bot/1.0)" };

interface Company {
  name: string;
  website: string | null;
  phone: string | null;
  domains: string[];
  logo: string | null;
  jobLink: string | null;
  profileLink: string | null;
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

function parseCompanies(html: string): Company[] {
  const $ = cheerio.load(html);
  const rows: Company[] = [];

  $("div.compy").each((_, el) => {
    const block = $(el);
    const name = block.find("h5").first().text().trim() || null;
    const logo = block.find("img").first().attr("src") || null;
    const website = block.find(".web").first().text().trim() || null;
    const phone = block.find(".phone").first().text().trim() || null;
    const domains: string[] = [];
    block.find(".domain-items span").each((_, s) => {
      const t = $(s).text().trim();
      if (t) domains.push(t);
    });
    const jobLink = block.find("a[href*='/jobs/']").first().attr("href") || null;
    const profileLink = block.find("a[href*='/companies-profile/']").first().attr("href") || null;

    if (name) {
      rows.push({ name, website, phone, domains, logo, jobLink, profileLink });
    }
  });

  return rows;
}

async function main() {
  const seen = new Set<string>();
  const all: Company[] = [];

  const firstHtml = await fetchHtml(BASE);
  const $ = cheerio.load(firstHtml);
  const totalPages = getTotalPages($);
  console.log(`Detected ${totalPages} pages`);

  for (let page = 1; page <= totalPages; page++) {
    const url = page === 1 ? BASE : `${BASE}?page=${page}`;
    const html = page === 1 ? firstHtml : await fetchHtml(url);
    const rows = parseCompanies(html);
    for (const row of rows) {
      const key = row.profileLink || row.name;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(row);
      }
    }
    console.log(`Page ${page}: ${rows.length} companies (total: ${all.length})`);
    await new Promise((r) => setTimeout(r, 400));
  }

  await writeFile(
    "data/companies.json",
    JSON.stringify({ scrapedAt: new Date().toISOString(), count: all.length, companies: all }, null, 2)
  );
  console.log(`Wrote ${all.length} companies to data/companies.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
