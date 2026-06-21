# cPanel deployment

## Requirements

- PHP 8.3+ with `mbstring`, `openssl`, `pdo_mysql`, `fileinfo`, `tokenizer`, `xml`, and `ctype`
- MySQL 8 or compatible MariaDB
- Composer 2
- Node 22 available during deployment, or locally built `public/build`
- HTTPS
- Cron access

## Production environment

Create a production `.env` outside public access:

```dotenv
APP_NAME="Lumink Agency OS"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.luminkco.com
APP_TIMEZONE=Asia/Dhaka

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
GOOGLE_DRIVE_REDIRECT_URI="${APP_URL}/settings/integrations/google-drive/callback"
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
```

Register both redirect URIs in the same Google Cloud OAuth application. Enable the Google Drive API and add the Drive scope to the OAuth consent screen.

## Directory layout

Keep the Laravel project above the web root. Point the subdomain document root to the project’s `public` directory. If cPanel cannot change the document root, create a dedicated subdomain whose root is the project `public` directory; do not expose the project root.

## Release commands

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Ensure `storage` and `bootstrap/cache` are writable by the PHP user.

## Cron

Run the Laravel scheduler every minute:

```cron
* * * * * cd /home/CPANEL_USER/lumink-agency-os && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

Process the database queue without requiring a permanent daemon:

```cron
* * * * * cd /home/CPANEL_USER/lumink-agency-os && /usr/local/bin/php artisan queue:work --stop-when-empty --tries=3 --timeout=120 >> /dev/null 2>&1
```

Adjust the PHP binary and project path to values shown by cPanel.

## Backups

Use cPanel’s database backup plus a daily encrypted off-host backup. Before launch, restore one backup into a staging database and verify login, client records, invoices, expenses, and approval history.

## Launch checks

- `/up` returns HTTP 200.
- Google sign-in rejects uninvited accounts.
- Owner can connect the Lumink Drive account.
- A test business folder structure can be provisioned.
- The scheduler and queue cron jobs create no failed jobs.
- Invoice and report PDFs download correctly.
- `APP_DEBUG` is false and HTTPS cookies are enabled.
