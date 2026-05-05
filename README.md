# Expense Tracker Frontend

This project is now structured as a standard React + Vite frontend and is ready for GitHub Pages deployment.

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- Chart.js + react-chartjs-2
- lucide-react

## Project Structure

```text
.
├── .github/workflows/deploy.yml
├── public/
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Push to `main`.
2. In GitHub repo settings, enable Pages and set source to **GitHub Actions**.
3. The workflow builds the app and deploys `dist/` automatically.

The Vite base path is configured for this repository:

- `/expense-tracker/`

If you change the repository name, update `base` in `vite.config.js`.
