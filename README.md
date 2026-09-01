# Kochi Startup Map — Infopark Data Fetcher

Auto-fetches Infopark Kochi's public company directory and live job board
daily, no server required.

## What it does

- `scripts/scrape-companies.ts` → `data/companies.json` (391 companies as of last test: name, website, phone, sector tags, logo, job link, profile link)
- `scripts/scrape-jobs.ts` → `data/jobs.json` (357 open roles as of last test: posted date, title, company, apply-by date, link)
- `scripts/scrape-adzuna.ts` → `data/adzuna-jobs.json` (Kochi jobs from the Adzuna API — broader than Infopark tenants, covers the wider Kochi market, up to ~250 results per run to stay well within the free tier)

## Run it yourself

```bash
npm install
npm run scrape:all
```

The Adzuna step requires two free credentials:

1. Register at https://developer.adzuna.com — you get an `app_id` and
   `app_key` instantly.
2. Run locally with:
   ```bash
   ADZUNA_APP_ID=xxx ADZUNA_APP_KEY=yyy npm run scrape:adzuna
   ```
3. For the automated daily run, add both as **GitHub repo secrets**
   (Settings → Secrets and variables → Actions → New repository
   secret): `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`. The workflow already
   reads them from there — no code changes needed once they're set.

If the secrets aren't set yet, `scrape:adzuna` exits with a clear
error and the other two scrapers still run fine — it won't break the
daily job.

## Auto-fetch setup (no server needed)

`.github/workflows/daily-fetch.yml` runs both scrapers every day at
8:30 AM IST via GitHub Actions' free scheduler, and commits the
refreshed `data/companies.json` / `data/jobs.json` straight back into
this repo.

**To activate it:**
1. Push this folder to a GitHub repo (public or private — Actions free
   tier covers both for normal usage).
2. Go to the repo's **Settings → Actions → General → Workflow
   permissions** and set it to "Read and write permissions" (needed
   so the workflow can commit the updated JSON back).
3. That's it — it'll run automatically every day. You can also trigger
   it manually anytime from the **Actions** tab → "Daily Infopark data
   fetch" → "Run workflow".

## Wiring into the Next.js app

Since the data lands as JSON files in the repo, the simplest v1 setup
is: your Next.js app reads `data/companies.json` and `data/jobs.json`
at build time (`getStaticProps` / server component fetch) and
redeploys automatically whenever the daily commit lands (Vercel
auto-deploys on push). No database needed for v1.

Once you outgrow that (community submissions, user accounts, saved
jobs), swap this for a step that upserts into Supabase/Postgres
instead of writing JSON — the scraping logic stays identical, only
the last step (`writeFile` → `db.upsert`) changes.

## Notes

- Respects Infopark's page structure as of Sep 2026 — if they redesign
  the site, the CSS selectors in the scripts (`div.compy`, `.domain-items
  span`, etc.) will need updating.
- Consider emailing info@infopark.in before public launch — this is
  government-body data, and they may offer cleaner API access or at
  least appreciate a heads-up.
- ~300 of 391 companies have no sector tags on Infopark's side — worth
  an LLM-assisted tagging pass separately.
