# Lumink Agency OS — Development Plan

## Summary

Build a responsive internal agency-management application using Laravel, Inertia, React, MySQL, and Tailwind CSS.

The accepted deep-indigo/gold command-center concepts define the product design. The MVP will replace scattered files, spreadsheets, and WhatsApp approvals as Lumink’s operational source of truth.

Success criteria:

- Nasim can see every urgent task, shoot, approval, publication, invoice, and expense from Today.
- Every task and cost can be traced to a business, campaign, or content item.
- Specialists can complete assigned work without accessing finances.
- Content moves through a consistent production and approval workflow.
- Client profitability and progress toward the BDT 80,000 hiring threshold are visible.
- Fresh & Juicy and Zaitoon can be configured without importing the existing workbook.

## Architecture and Security

- Laravel + Inertia + React with TypeScript and Tailwind CSS.
- MySQL database, Asia/Dhaka timezone, BDT as the sole MVP currency.
- Google OAuth for internal authentication; only invited Google accounts may enter.
- Roles:
  - Owner: unrestricted access.
  - Manager: businesses, campaigns, content, tasks, files, schedules, reports, and team assignments.
  - Specialist: assigned work, relevant comments, assets, time logs, and deadlines.
- Owner-only access to agency finance, profitability, user administration, and integrations.
- Laravel policies must enforce permissions server-side—not only hide controls.
- Maintain an audit log for financial changes, approvals, status changes, assignments, and document generation.
- Private files use authorized download routes. Public documents and approvals use revocable, expiring signed URLs.

## Core Product

### Today and Work Management

- Today is the default screen after login.
- Show overdue work, today’s assignments, shoots, approval deadlines, publishing times, unpaid invoices, and missing receipts.
- Unified task model supports:
  - Standalone agency tasks.
  - Business tasks.
  - Campaign tasks.
  - Content-production tasks.
  - Recurring tasks.
- Fields include owner, collaborators, priority, status, estimate, actual time, due date/time, checklist, comments, attachments, dependencies, and linked entity.
- Views: Today, My Work, business task list, Kanban, and internal calendar.
- Store notifications in-app for assignments, mentions, approaching deadlines, overdue work, approval responses, and financial alerts.

### Business Workspaces

Each business contains:

- Contacts and approval contacts.
- Platforms and profile links.
- Brand guidance, voice notes, fonts, colors, and references.
- Retainer, agreement dates, billing day, deliverable targets, revision limits, and approval deadline.
- Campaigns, content, tasks, shoots, files, reports, invoices, expenses, and profitability.
- Guided onboarding creates the business, monthly agreement, deliverable targets, Drive folders, and initial reporting baseline.

No workbook import will be built or performed.

### Campaigns and Content

- Campaigns connect objectives, audience, offer, menu items, date range, content, costs, and performance periods.
- One master content item contains its concept, brief, hook, script, CTA, shoot notes, assets, tasks, comments, and campaign.
- Platform versions for Facebook, Instagram, and TikTok contain their own caption, format, planned publish time, and publication status.
- Default workflow:
  - Idea
  - Planned
  - Scripted
  - Shoot scheduled
  - Shot
  - Editing/design
  - Internal review
  - Client review
  - Approved
  - Scheduled
  - Published
- Transitions record actor, timestamp, comment, and revision number.
- Reusable content and campaign templates can create customized monthly plans.
- V1 records scheduled and published states but does not publish through platform APIs.

### Client Approval

- Authorized users generate an expiring signed link for a content item or review batch.
- Client enters their name and can approve, request revisions, or comment without an account.
- Record client name, action, timestamp, comments, content version, and revision number.
- Links can be revoked, regenerated, or allowed to expire.
- Approved content becomes locked against silent asset/script changes; edits create a new review version.

### Files and Google Drive

- Connect one Lumink-owned Google account.
- Automatically create standardized folders:
  - Business
  - Campaign
  - Content item
  - Raw footage
  - Working files
  - Approved exports
  - Reports and invoices
- Store Drive IDs and metadata in the app rather than duplicating large media.
- If Drive is unavailable, preserve records and provide a retry action.
- Expense receipts and small internal documents may use application storage.

### Finance

Management finance only—no double-entry accounting, tax filing, bank feeds, or balance sheet.

- Store recurring retainers and agreement billing rules.
- Generate invoices with retainer and optional line items for onboarding, extra shoots, travel, add-ons, discounts, and adjustments.
- Track issued, due, partial, paid, overdue, and cancelled states.
- Record one or multiple payments against an invoice.
- Expenses contain date, vendor, category, amount, payment method, receipt, notes, and allocation.
- Allocation types:
  - Direct business/campaign/content cost.
  - General agency overhead.
- Initial categories include shoots, transport, equipment, props, subscriptions, freelancers, and administration.
- Dashboard calculations:
  - Revenue and collected cash.
  - Outstanding balances.
  - Direct costs and overhead.
  - Client gross contribution.
  - Tracked hours and effective hourly value.
  - Estimated operating margin.
  - Recurring revenue progress toward BDT 80,000.
- Financial figures are recalculated from transaction records rather than manually entered totals.

### Performance and Documents

- Twice-monthly report periods store platform metrics, client-reported sales change, baseline period, campaign notes, interpretation, and next actions.
- Generate branded PDF invoices and performance reports.
- Generate secure, expiring view links and downloadable PDFs; delivery remains manual through WhatsApp or email.
- Store uploaded agreements in MVP.
- Phase 2 adds reusable proposal and contract templates, document generation, acceptance tracking, and version history.

## Core Interfaces and Data Model

Primary records:

- User, Invitation, Role and Permission
- Business, BusinessContact, PlatformProfile, Agreement and DeliverableTarget
- Campaign and CampaignTemplate
- ContentItem, PlatformVersion, ContentAsset and WorkflowTransition
- Task, ChecklistItem, Comment, TimeEntry and RecurrenceRule
- ShootSession
- ApprovalRequest, ApprovalVersion and ApprovalResponse
- DriveConnection and DriveResource
- Invoice, InvoiceLine, Payment, Expense and ExpenseAllocation
- PerformancePeriod and PerformanceMetric
- GeneratedDocument, ShareLink, Notification and AuditEvent

External interfaces:

- Google OAuth callback restricted to invited accounts.
- Google Drive OAuth connection and folder/file metadata synchronization.
- Signed public approval routes with expiration and revocation checks.
- Signed invoice/report viewing routes.
- PDF generation service driven by versioned Lumink templates.

## Delivery Sequence

1. Foundation: authentication, permissions, app shell, audit logging, cPanel deployment workflow, database backups, and design tokens.
2. Operations: guided business setup, unified tasks, Today, My Work, calendar, recurring tasks, time tracking, and notifications.
3. Content: campaigns, templates, production pipeline, platform versions, shoots, Drive integration, comments, and approvals.
4. Finance: agreements, invoices, payments, expenses, allocations, profitability, and hiring-threshold dashboard.
5. Reporting: manual performance periods, PDF invoices/reports, secure share links, responsive QA, and production hardening.
6. Phase 2: proposal and contract generation, deeper workload forecasting, optional external calendar sync, and social-platform integrations only if justified by usage.

## Deployment

- Deploy to the existing cPanel environment with PHP, MySQL, HTTPS, Composer, Node build support, and cron access verified before implementation.
- Use Laravel’s database queue.
- Run `schedule:run` every minute through cron.
- Process queued jobs using short, cron-triggered workers with `--stop-when-empty`, avoiding dependence on a permanent daemon.
- Configure failed-job tracking and retry controls.
- Schedule encrypted database backups and verify restoration.
- Keep OAuth credentials and signing secrets outside the repository.
- Provide staging and production environment configurations with separate databases and OAuth callbacks.

## Test Plan

- Role and policy tests proving specialists cannot access finance or unrelated businesses.
- Invitation and Google-login tests, including uninvited and disabled accounts.
- Task recurrence, dependencies, overdue calculations, time entries, and timezone boundaries.
- Every content workflow transition, revision cycle, and platform-version behavior.
- Approval-link expiration, revocation, tampering, repeated responses, and post-approval edits.
- Drive authorization failure, missing folders, API errors, retries, and disconnected accounts.
- Invoice totals, partial payments, overdue status, discounts, extra charges, and cancellations.
- Direct-cost versus overhead allocation and client-profitability calculations.
- Report baseline and sales-percentage calculations.
- PDF generation and signed document access.
- Desktop, tablet, and phone layouts for core workflows.
- cPanel cron, queue, backup, OAuth callback, and production deployment smoke tests.

## Acceptance Criteria

- Both current clients can be configured through the onboarding wizard.
- Nasim can run a complete content item from idea through publication.
- A client can review and approve content without an account.
- Editors and designers can work from assigned queues without seeing finance.
- Every expense can be classified and included in client or agency profitability.
- Retainers, extras, invoices, payments, and outstanding balances reconcile correctly.
- Twice-monthly reports can be generated and securely shared.
- The app remains usable from a phone during shoots.
- No data from `Businees Summary - Local Copy.xlsx` is read, imported, or used.

## Assumptions

- V1 is single-agency, not a multi-agency SaaS product.
- English only, BDT only, and Asia/Dhaka timezone.
- One Lumink Google account owns Drive assets.
- Content publishing and document delivery remain manual.
- No client portal, external calendar sync, tax engine, payroll, or formal accounting in MVP.
- The approved interface concepts are the visual source of truth.
