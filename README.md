# Shtegu.com

New front end for the Albanian-language news portal Shtegu.com.

Articles, categories and pages come live from the existing WordPress at
`shtegu.com` through its REST API (`/wp-json/wp/v2`). New posts written in
WordPress show up here automatically. No build step: plain HTML, CSS and JS.

## Pages

| File | Shows |
| --- | --- |
| `index.html` | Home: lead story, latest news, one block per section |
| `kategoria.html?k=<slug>` | Category list (`?q=<term>` searches) |
| `artikulli.html?s=<slug>` | Single article (`?f=<slug>` for pages like Kontakti, Impressum) |

Menu, home sections and ad prices are set in `assets/config.js`.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Deploy

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). WordPress
stays where it is and acts as the editor/back end.
