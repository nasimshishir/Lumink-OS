# Lumink Agency OS

Internal operations software for Lumink Co. It manages daily work, restaurant client workspaces, content production, passwordless client approvals, invoices, expenses, profitability, reports, and team access.

## Stack

- Laravel 13, PHP 8.3
- Inertia 3, React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui source components
- SQLite for local development; MySQL for production
- Google OAuth, Google Drive API, Dompdf

## Local setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
npm run build
php artisan serve
```

Open `http://127.0.0.1:8000/demo-login` in a local environment to enter the seeded owner workspace. Production access uses invited Google accounts only.

## Main workflows

- **Today:** overdue work, daily schedule, content progress, approvals, and financial alerts.
- **Businesses:** agreements, deliverables, campaigns, active content, performance, and profitability.
- **Content:** master item plus Facebook, Instagram, and TikTok versions through the complete production workflow.
- **Approvals:** revocable, expiring links that record named client approval or change requests.
- **Finance:** retainers, extra charges, invoices, payments, direct costs, overhead, and the BDT 80,000 hiring trigger.
- **Reports:** twice-monthly sales and platform performance periods with branded PDFs.
- **Team:** invited Google accounts with owner, manager, and specialist access.

The existing business-summary workbook is intentionally not imported or read by the application.

## Quality commands

```bash
composer test
npm run lint:check
npm run format:check
npm run types:check
npm run build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for cPanel setup.
