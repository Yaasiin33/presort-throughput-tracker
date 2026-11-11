# Presort Throughput Tracker

A one-page tracker for hour-by-hour presort throughput across two platforms and their combined total. It measures each hour against its target and keeps a day-by-day record. It runs in any browser, with nothing to install and no account or server needed.

**New here? Follow [SETUP-GUIDE.md](SETUP-GUIDE.md).** It walks through putting the tracker online with GitHub Pages, click by click, in about 10 minutes.

## Targets

| | Per hour |
|---|---|
| Platform 1 | 9,500 |
| Platform 2 | 4,500 |
| Total (P1 + P2) | 14,000 |

Change them with **Edit targets**. Each day keeps the targets it was recorded with.

## What's on the page

- **Day cards** for Total, Platform 1 and Platform 2: volume so far against target, hours that hit target, the best hour, and a 24-hour strip of hits and misses.
- **Shipments per hour**: P1 and P2 stacked, with target lines and a status dot for each hour.
- **Hour by hour**: one row per hour of the sort day (03:00 to 02:00). Type P1 and P2; the total and the difference from target fill in by themselves.
- **Day-by-day record**: every day with figures, saved automatically. It shows:
  - days recorded, total shipments, average day and days at target;
  - a bar per day showing total as a % of target;
  - a table of each day's total, P1 %, P2 %, hours at target and change from the day before;
  - 7-day, 30-day or all-time views. Click a day to open it.
- **Downloads**: the daily record or every hour as CSV for Excel, and a full backup file.

Status colours:

- **▲ green**: at or above target
- **● amber**: within 10% under
- **▼ red**: more than 10% under

The **Mono** switch removes the status colours. The arrows and dots still show hits and misses. The page follows the device's light or dark setting.

## Where the data is kept

- Figures save in the browser you type them in (localStorage) as soon as you leave each box. They stay on that device and aren't sent anywhere.
- **Download backup** saves everything to a `.json` file. **Restore backup** loads it on another device or browser. The page reminds you when a backup is more than 7 days old.
- **Copy share link for this day** puts that day's figures and targets in the link itself (after the `#`). Anyone who opens it sees the same numbers and can save a copy.

## Files

| File | What it is |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Look, light and dark themes |
| `app.js` | Saving, record, share links, backups, CSV, charts |
| `SETUP-GUIDE.md` | Step-by-step guide to putting it online and using it |

Fonts load from Google Fonts and fall back to system fonts if they can't load. To try it without GitHub, open `index.html` in a browser.

## Licence

MIT. See [LICENSE](LICENSE).
