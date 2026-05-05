# AI Coding Agent Instructions for Expense Tracker

Welcome! This project is a single-page React app for tracking expenses, built with Vite and Tailwind CSS, and deployed via GitHub Pages.

## Build & Development

- **Install dependencies:** `npm install`
- **Start dev server:** `npm run dev`
- **Production build:** `npm run build`
- **Preview build:** `npm run preview`
- **Deploy:** Push to `main` (GitHub Actions auto-deploys to Pages)

## Key Files & Structure

- `src/App.jsx`: Main React component (all UI/logic lives here)
- `src/main.jsx`: Entry point, renders `App`
- `src/index.css`: Tailwind CSS imports and base styles
- `vite.config.js`: Vite config, sets `base` for GitHub Pages
- `.github/workflows/deploy.yml`: GitHub Actions workflow for deployment
- `public/.nojekyll`: Ensures GitHub Pages serves static files correctly

## Conventions & Notes

- **Vite base path** is `/expense-tracker/` (update in `vite.config.js` if repo name changes)
- **No backend**: All data is stored in browser memory or via SQLite file import/export
- **Charts**: Uses Chart.js via `react-chartjs-2`
- **Icons**: Uses `lucide-react`
- **Tailwind**: Utility-first styling, see `tailwind.config.js`
- **No routing**: Single-page, all navigation is stateful

## Common Pitfalls

- If you see blank charts or missing data, ensure the required CDN scripts for `sql.js` and `xlsx` are loaded (see `App.jsx`)
- For GitHub Pages, always check the `base` path if the app does not load assets/styles

## Links

- [README.md](README.md): Project overview, setup, and deployment instructions
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

---

For new features, follow the patterns in `App.jsx` and keep all UI logic in the main component unless refactoring for complexity.
