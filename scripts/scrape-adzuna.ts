// Fetches Kochi job listings from the Adzuna API into data/adzuna-jobs.json
// Requires ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables.
// Get free credentials at https://developer.adzuna.com
// Run: ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy npx tsx scripts/scrape-adzuna.ts

import { writeFile } from "fs/promises";

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;
const COUNTRY = "in"; // India
const LOCATION = "Kochi";
const RESULTS_PER_PAGE = 50;
const MAX_PAGES = 5; // 5 x 50 = up to 250 results, well within the ~1,000 calls/month free tier

interface AdzunaJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  redirect_url: string | null;
  created: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_is_predicted: string | null;
  category: string | null;
}

async function fetchPage(page: number): Promise<any> {
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/${page}`
  );
  url.searchParams.set("app_id", APP_ID!);
  url.searchParams.set("app_key", APP_KEY!);
  url.searchParams.set("where", LOCATION);
  url.searchParams.set("results_per_page", String(RESULTS_PER_PAGE));
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna request failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function main() {
  if (!APP_ID || !APP_KEY) {
    console.warn(
      "Skipping Adzuna fetch: ADZUNA_APP_ID / ADZUNA_APP_KEY not set. " +
      "Get free credentials at https://developer.adzuna.com and add them as " +
      "GitHub Actions secrets (see README). The other data sources are unaffected."
    );
    process.exit(0); // exit cleanly so scrape:all and the daily workflow don't fail
  }

  const allJobs: AdzunaJob[] = [];
  let totalAvailable = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchPage(page);
    totalAvailable = data.count ?? totalAvailable;
    const results = data.results ?? [];

    for (const r of results) {
            allJobs.push({
                      id: r.id,
                      title: r.title,
                      company: r.company?.display_name ?? null,
                      location: r.location?.display_name ?? null,
                      description: r.description ?? null,
                      redirect_url: r.redirect_url ?? null,
                      created: r.created ?? null,
                      salary_min: r.salary_min ?? null,
                      salary_max: r.salary_max ?? null,
                      salary_is_predicted: r["salary_is_predicted"] ?? null,
                      category: r.category?.label ?? null,
            });
    }
        console.log(`Page ${page}: ${results.length} jobs (total: ${allJobs.length}, available: ${totalAvailable})`);
        if (results.length < RESULTS_PER_PAGE) break;
        await new Promise((r) => setTimeout(r, 500));
  }

    await writeFile(
          "data/adzuna-jobs.json",
          JSON.stringify({ scrapedAt: new Date().toISOString(), count: allJobs.length, totalAvailable, jobs: allJobs }, null, 2)
        );
    console.log(`Wrote ${allJobs.length} jobs to data/adzuna-jobs.json`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
