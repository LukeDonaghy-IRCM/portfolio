# Luke Donaghy portfolio

A one-page portfolio with no build step. Everything the page shows comes from `projects.csv` and the images in `projects/`.

## Folder layout

```
index.html            the page
assets/styles.css     Out There styles
assets/app.js         loads the CSV, finds images, runs the pop-ups and galleries
projects.csv          master list of projects (one row per project)
projects/<folder>/    one folder per project: 1.jpg, 2.png, 3.webp ...
images/luke.jpg       your portrait next to your name (optional)
_headers              Cloudflare caching rules
```

## Adding or editing a project

1. Open `projects.csv` in Google Sheets, Excel or Numbers.
2. Add or edit a row. Row order is the order on the page.
3. Make a folder in `projects/` whose name matches the `folder` column exactly.
4. Drop images in, named by number: `1.jpg`, `2.png`, `3.webp` and so on. Image 1 is the card cover, and every image appears in the gallery at the top of the pop-up.
5. Save the CSV (as CSV, UTF-8) and upload the site again.

Image rules: any of .jpg, .jpeg, .png, .webp, .avif or .gif (upper or lower case), numbered from 1 with no gaps. Use one file per number; if you have both `2.jpg` and `2.png`, the .jpg is used. The site stops looking at the first missing number, so if you have 1, 2 and 4, only 1 and 2 will show. Landscape 16:9 works best; about 1600px wide and under 400 KB keeps the page fast.

To hide a project without deleting it, set `published` to `no`.

## CSV columns

| Column | What goes in it |
| --- | --- |
| published | `yes` or `no` |
| folder | Folder name in `projects/`. Also the direct link: `yoursite.com/#folder` |
| title | Project name |
| client | Shown above the title |
| summary | One or two sentences on the card |
| headline | The headline result on the card |
| tags | Separated by semicolons: `Web; SEO; CRM` |
| note | Optional line in the pop-up, e.g. "Internal work, so samples can't be shared." |
| situation, task | STAR text |
| action | One step per line (Alt+Enter in a Sheets cell). Several lines become a list |
| cover_alt | Optional description of image 1 for screen readers |
| result1_figure … result4_figure | The big number, e.g. `€400k+`. Leave blank for a text-only result |
| result1_text … result4_text | What the number means |

## Editing in Google Sheets instead

Import `projects.csv` into a Sheet, then File > Share > Publish to web, choose the sheet and "Comma-separated values", and copy the link. Paste it as `csvUrl` at the top of `assets/app.js` and upload once. After that, edits in the Sheet show on the live site within a few minutes, with no re-upload. Images still live in `projects/`.

## Previewing on your computer

Browsers block the CSV when you double-click `index.html`, so run a small local server from this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing on Cloudflare Pages

Easiest: Cloudflare dashboard > Workers & Pages > Create > Pages > Upload assets, and drag this folder in. Upload again whenever you change the CSV or images.

With Git: push this folder to a GitHub repo and connect it in Pages. Leave the build command empty and set the output directory to `/`. Every push publishes automatically.

The three `projects/2-wheels-4-purpose/*.jpg` files are placeholders for testing the gallery. Replace or delete them.
