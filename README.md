# Dear Diary

Dear Diary is a private two-person journaling web app. This repository currently contains the initial production-oriented Next.js scaffold only: no authentication, database, offline sync, or final UI has been implemented yet.

## Tech stack

- [Next.js](https://nextjs.org/) with the App Router
- TypeScript
- Tailwind CSS
- ESLint
- npm
- `src/` application directory

## Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

## Automated checks

Run linting:

```bash
npm run lint
```

Run TypeScript type checking:

```bash
npm run typecheck
```

Create a production build:

```bash
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` when local-only configuration is needed:

```bash
cp .env.example .env.local
```

The initial scaffold does not require real secrets.
