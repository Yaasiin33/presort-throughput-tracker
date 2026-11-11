# Setup guide: put the tracker online

This takes about 10 minutes and costs nothing. Do it on a computer, not a phone, because GitHub's upload page is hard to use on a small screen. When you finish you'll have a link like:

`https://YOUR-USERNAME.github.io/presort-throughput-tracker/`

Anyone with that link can open the tracker.

---

## Part 1: Unzip the files

1. Find `presort-throughput-tracker.zip` in your Downloads folder.
2. Unzip it:
   - **Windows:** right-click the zip, choose **Extract All…**, then click **Extract**.
   - **Mac:** double-click the zip.
3. Open the new `presort-throughput-tracker` folder. You should see exactly these 6 files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `SETUP-GUIDE.md`
   - `LICENSE`

Leave this folder open. You'll drag these files in Part 4.

---

## Part 2: Sign in to GitHub

1. Go to **https://github.com**.
2. If you have an account, click **Sign in**.
3. If you don't, click **Sign up** and follow the steps: email, password and a username. Your username becomes part of your link, so pick one you're happy with.

---

## Part 3: Create the repository

A repository ("repo") is a folder on GitHub that holds the files.

1. Click the **+** in the top-right corner of any GitHub page.
2. Click **New repository**.
3. In **Repository name**, type: `presort-throughput-tracker`
4. Choose **Public**. This is what makes it open source and lets Pages show it for free.
5. Leave every other box unticked: no README, no .gitignore, no licence. Those files are already in the zip.
6. Click the green **Create repository** button at the bottom.

---

## Part 4: Upload the files

1. You're now on the new, empty repo page. In the blue box near the top, find the sentence starting "Get started by creating a new file or **uploading an existing file**". Click **uploading an existing file**.
2. In the folder from Part 1, select all 6 files (**Ctrl + A** on Windows, **Cmd + A** on Mac).
3. Drag them onto the GitHub page, where it says "Drag files here".

   > **Important:** drag the **files**, not the folder. If you drag the whole folder, the page won't load (see Troubleshooting).

4. Wait until all 6 file names appear in the list under the drop area.
5. Scroll down and click the green **Commit changes** button.
6. You're taken back to the repo page and should see the 6 files listed.

---

## Part 5: Turn on GitHub Pages

1. At the top of the repo page, click the **Settings** tab (the gear icon, right of **Insights**).
2. In the left-hand menu, under **Code and automation**, click **Pages**.
3. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
4. Under **Branch**, open the first dropdown (it says **None**) and pick **main**. Leave the second dropdown on **/ (root)**.
5. Click **Save**.

---

## Part 6: Get your link

1. Wait 1 to 2 minutes, then refresh the **Pages** settings page.
2. A box appears at the top saying **"Your site is live at https://YOUR-USERNAME.github.io/presort-throughput-tracker/"**.
3. Click **Visit site**. The tracker opens on today's sort day.
4. Copy the link from the address bar. This is the link you share.

---

## Part 7: Use it every day

1. **Open the tracker on the device you'll use on shift** (work PC or phone) and keep using that same device and browser. Figures are saved in that browser.
   - On a phone, add it to your home screen: **iPhone (Safari):** Share → **Add to Home Screen**. **Android (Chrome):** ⋮ menu → **Add to Home screen**.
2. **After each hour**, read P1 (A01) and P2 (A02) from the hourly throughput chart and type them into that hour's row in **Hour by hour**. Press **Enter** or tap away to save. You can type `9500` or `9.5k`.
3. **The day records itself.** As soon as you enter a figure, the day appears in **Day-by-day record** at the bottom. Nothing else to press.
4. **To look back,** click **Day-by-day record ↓** at the top, switch between **7 days**, **30 days** and **All**, and click any date to open that day's hours.
5. **To send a day to someone,** open the day and click **Copy share link for this day**, then paste the link in a message. They see that day's figures and can save a copy.
6. **To get the record into Excel,** click **Download daily record (CSV)** (one row per day) or **Download every hour (CSV)** (one row per hour).

---

## Part 8: Keep the record safe (once a week)

The record lives in one browser. Clearing browsing data, using a private window or switching devices loses it unless you have a backup.

1. Once a week, scroll to **Share and back up** and click **Download backup**. It saves a small `.json` file. Keep it somewhere safe, such as OneDrive or Google Drive.
2. The page tells you when you last backed up. The message turns red after 7 days or if you've never backed up.
3. **To move to a new device or browser:** open the tracker there, click **Restore backup** and choose your latest backup file. Every day comes back.

---

## Changing targets

Click **Edit targets** above the hour-by-hour table, change the numbers and click **Save targets**.

- New targets apply to the day you're on and every new day.
- Earlier days keep the targets they were recorded with, so the record stays fair.
- **Reset** puts back 9,500 / 4,500 / 14,000.

---

## Updating the tracker later

If you get new versions of the files:

1. Open the repo on GitHub.
2. Click **Add file** → **Upload files**.
3. Drag in the new files, then click **Commit changes**. Files with the same name are replaced.

The site updates within a couple of minutes. Your recorded figures aren't affected, because they live in your browser, not on GitHub.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| **404 "There isn't a GitHub Pages site here"** | Wait 2 minutes and refresh. If it's still there, open the repo and check that `index.html` is in the main list and not inside a folder. If it's inside a folder, upload the 6 files again at the top level (Part 4). |
| **No Pages option, or "Upgrade" message** | The repo is private. Go to **Settings → General**, scroll to **Danger Zone**, click **Change visibility** and make it **Public**. |
| **My figures disappeared** | You're probably on a different device or browser, or a private window. Open the tracker where you entered them, or use **Restore backup**. |
| **"This browser won't keep figures"** | You're in a private or incognito window. Open the link in a normal window. |
| **The page looks unstyled** | Refresh once. If it persists, check that `styles.css` and `app.js` were uploaded next to `index.html`. |
