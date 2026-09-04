# Mealo Menu Scraper

A small data pipeline that collects and normalizes dining-hall menu information for the Mealo project.

The scraper uses Playwright to load Barry University's Roussell Dining Hall menu, capture the underlying menu API response, and produce consistent JSON for breakfast, lunch, and dinner.

## What it produces

For each service period, the normalized output includes:

- dining station and menu item names;
- portion and ingredient information when available;
- calories and macronutrients;
- allergen and dietary tags;
- dated snapshots plus a continuously updated `latest` dataset.

```text
public/menu/
  YYYY-MM-DD/
    breakfast.json
    lunch.json
    dinner.json
    raw-breakfast.json
    raw-lunch.json
    raw-dinner.json
  latest/
    ...
```

The raw response is retained for traceability, while the normalized files provide a stable shape for an application to consume.

## Run locally

### Requirements

- Node.js 18 or newer
- npm

```bash
git clone https://github.com/rocks06/mealo-menu-scraper.git
cd mealo-menu-scraper
npm install
npx playwright install chromium
npm run scrape
```

By default, the scraper uses the current date in the `America/New_York` timezone. To request another date:

```bash
DATE=2026-09-04 npm run scrape
```

## Data source and limitations

This project reads publicly available menu information from Dine On Campus for Barry University. Availability, nutrition values, ingredients, and allergens depend on the source data and may be incomplete or change without notice. This repository is an independent development project and is not an official Barry University or Dine On Campus service.

## Status

The repository contains the scraper and historical development snapshots. It is maintained as a supporting data-engineering component rather than a standalone consumer product.
