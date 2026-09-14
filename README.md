# Zix Hero Sections

> **Beautiful Shopify Hero Sections. No Coding Required.**

A production-ready Shopify App Store application that allows merchants to add beautiful, modern, responsive Hero Sections to their storefront without writing a single line of code.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Shopify App Configuration](#shopify-app-configuration)
8. [Local Development](#local-development)
9. [Theme App Extension Setup](#theme-app-extension-setup)
10. [Billing Setup](#billing-setup)
11. [Production Deployment](#production-deployment)
12. [How to Add a New Hero Template](#how-to-add-a-new-hero-template)
13. [Plan System](#plan-system)
14. [Security](#security)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Shopify Admin (Browser)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Zix Hero Sections Embedded App          │    │
│  │    React + TypeScript + Shopify Polaris          │    │
│  │    App Bridge (Shopify Admin integration)        │    │
│  └─────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS API calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Express.js Backend (Node.js + TypeScript)     │
│                                                         │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │ /sections│ │/templates │ │ /billing │ │/settings │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Shopify App Express Middleware              │   │
│  │      (OAuth, session validation, webhooks)       │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ Prisma ORM
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                   │
│   shops / sessions / hero_sections / subscriptions      │
│   usage / shop_settings                                 │
└─────────────────────────────────────────────────────────┘

                        ┌────────────────────────────────┐
                        │  Shopify Theme App Extension   │
                        │  (Liquid + CSS + Vanilla JS)   │
                        │  Renders hero sections on the  │
                        │  storefront natively           │
                        └────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Shopify Polaris 12, App Bridge |
| **Backend** | Node.js 18+, Express, TypeScript |
| **Auth/Integration** | @shopify/shopify-app-express, @shopify/shopify-api |
| **Database** | PostgreSQL + Prisma ORM |
| **Session Storage** | @shopify/shopify-app-session-storage-prisma |
| **Build Tool** | Vite |
| **Storefront Extension** | Shopify Liquid, Vanilla CSS, Vanilla JS |

---

## Project Structure

```
zix-hero-sections/
├── web/                            # Main app (backend + frontend)
│   ├── src/                        # Backend source
│   │   ├── index.ts                # Express server entry
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts     # Global error handler
│   │   │   └── requireShop.ts      # Shop authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts             # Session/auth routes
│   │   │   ├── sections.ts         # Hero section CRUD
│   │   │   ├── templates.ts        # Template listing
│   │   │   ├── billing.ts          # Shopify billing
│   │   │   ├── settings.ts         # App settings
│   │   │   ├── shop.ts             # Dashboard data
│   │   │   └── webhooks.ts         # Shopify webhooks
│   │   ├── services/
│   │   │   ├── shopService.ts      # Shop DB operations
│   │   │   ├── usageService.ts     # Plan limit enforcement
│   │   │   └── billingService.ts   # Shopify billing API
│   │   └── shared/                 # Types shared with frontend
│   │       ├── types.ts            # Shared TypeScript types
│   │       └── templates.ts        # Template registry (14 templates)
│   ├── frontend/                   # React app
│   │   ├── src/
│   │   │   ├── App.tsx             # Root component + routing
│   │   │   ├── contexts/
│   │   │   │   └── AppContext.tsx  # Global shop/plan state
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Templates.tsx
│   │   │   │   ├── Billing.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── sections/
│   │   │   │   │   ├── AllSections.tsx
│   │   │   │   │   ├── MySections.tsx
│   │   │   │   │   └── CreateSection.tsx
│   │   │   │   └── editor/
│   │   │   │       └── EditorPage.tsx   # Visual editor
│   │   │   ├── components/
│   │   │   │   ├── layout/AppLayout.tsx # Nav + Frame
│   │   │   │   ├── editor/HeroPreview.tsx  # Preview renderer
│   │   │   │   └── shared/             # Badges, stat cards
│   │   │   └── lib/
│   │   │       └── api.ts             # Typed API client
│   │   └── index.html
│   └── prisma/
│       ├── schema.prisma              # DB schema
│       └── seed.ts                    # Demo data seed
├── extensions/
│   └── zix-hero-sections/            # Theme App Extension
│       ├── blocks/
│       │   └── hero-section.liquid    # Main block with full schema
│       ├── snippets/
│       │   ├── zix-hero-content.liquid
│       │   └── zix-hero-product.liquid
│       └── assets/
│           ├── zix-hero.css           # Scoped storefront styles
│           └── zix-hero.js            # Animations, countdown, slider
├── shopify.app.toml                   # Shopify app config
├── .env.example                       # Environment variable template
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14
- **Shopify Partner Account** — [partners.shopify.com](https://partners.shopify.com)
- **Shopify CLI** — `npm install -g @shopify/cli`
- **ngrok** or **Cloudflare Tunnel** for local development

---

## Environment Variables

Copy `.env.example` to `web/.env` and fill in your values:

```bash
cp .env.example web/.env
```

### Required Variables

| Variable | Description |
|---|---|
| `SHOPIFY_API_KEY` | From Shopify Partner Dashboard → App → Client credentials |
| `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard → App → Client credentials |
| `SHOPIFY_APP_URL` | Your app's public HTTPS URL (ngrok URL for local dev) |
| `SCOPES` | `write_themes,read_themes,read_products,write_products` |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 3000) |

### Optional / Configurable

| Variable | Default | Description |
|---|---|---|
| `PRICE_BASIC` | `9.99` | Basic plan monthly price (USD) |
| `PRICE_PRO` | `19.99` | Pro plan monthly price (USD) |
| `PRICE_ULTIMATE` | `39.99` | Ultimate plan monthly price (USD) |
| `SESSION_SECRET` | — | Secret for session signing (32+ chars) |

---

## Database Setup

### 1. Create PostgreSQL database

```sql
CREATE DATABASE zix_hero_sections;
```

### 2. Install dependencies

```bash
cd web
npm install
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run migrations

**Development:**
```bash
npm run db:migrate
```

**Production:**
```bash
npm run db:migrate:prod
```

### 5. (Optional) Seed demo data

```bash
npm run db:seed
```
> ⚠️ Only run seed in development. It creates a demo shop with sample sections.

### 6. (Optional) Open Prisma Studio

```bash
npm run db:studio
```

---

## Shopify App Configuration

### 1. Create app in Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Apps → Create app**
3. Choose **Create app manually**
4. Enter app name: `Zix Hero Sections`
5. Copy the **Client ID** (SHOPIFY_API_KEY) and **Client secret** (SHOPIFY_API_SECRET)

### 2. Configure app URLs

In the Partner Dashboard, under **App setup → URLs**:

- **App URL:** `https://your-ngrok-url.ngrok.io`
- **Redirect URLs:** `https://your-ngrok-url.ngrok.io/api/auth/callback`

### 3. Configure required scopes

In `shopify.app.toml`, scopes are:
```
write_themes, read_themes, read_products, write_products, read_script_tags, write_script_tags
```

---

## Local Development

### 1. Start the tunnel

```bash
ngrok http 3000
```
Copy the HTTPS URL and set it as `SHOPIFY_APP_URL` in your `.env`.

### 2. Update Shopify Partner Dashboard

Update the App URL and Redirect URL with your new ngrok URL.

### 3. Start the server

```bash
# From the web/ directory:
cd web
npm run dev
```

This starts:
- **Backend** on `http://localhost:3000`
- **Frontend** (Vite) on `http://localhost:3001`

### 4. Install on a development store

1. In Partner Dashboard, go to your app
2. Click **Test on development store**
3. Follow the OAuth flow
4. The app will install on your dev store

---

## Theme App Extension Setup

The Theme App Extension allows the hero sections to appear in Shopify's Theme Editor.

### Register the extension with Shopify CLI

```bash
shopify app deploy
```

Or during development:
```bash
shopify app dev
```

### Using the extension

After deployment:

1. Go to **Online Store → Themes → Customize**
2. Navigate to a page (homepage, etc.)
3. Click **Add section** or **Add block**
4. Under **Apps**, find **Zix Hero Section**
5. Click to add, then configure settings in the left panel
6. Click **Save**

---

## Billing Setup

Billing uses Shopify's native **Recurring Application Charge** (GraphQL API).

### Plan Pricing

Configure prices via environment variables:

```env
PRICE_BASIC=9.99
PRICE_PRO=19.99
PRICE_ULTIMATE=39.99
```

### Test Mode

In non-production environments, charges are created as **test charges** — they go through the full Shopify billing flow but don't charge real money. Set `NODE_ENV=production` to use real billing.

### Billing Flow

1. Merchant clicks **Upgrade** in the app
2. App calls `POST /api/billing/subscribe` with plan name
3. Backend creates a `RecurringApplicationCharge` via Shopify GraphQL
4. Merchant is redirected to Shopify's billing confirmation page
5. After confirmation, Shopify redirects to `GET /api/billing/confirm?charge_id=...`
6. Subscription is activated in the database

---

## Production Deployment

### Recommended: Railway / Render / Heroku

1. Set all environment variables in your hosting platform
2. Set `NODE_ENV=production`
3. Run database migrations:
   ```bash
   npm run db:migrate:prod
   ```
4. Build and start:
   ```bash
   npm run build
   npm run start
   ```

### Docker (optional)

Create a `Dockerfile` in `web/`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
RUN npx prisma generate
CMD ["npm", "run", "start"]
```

---

## How to Add a New Hero Template

Adding template #15 (or any new template) requires changes in **three places**:

### 1. Add to the template registry

In `web/src/shared/templates.ts`, add a new entry to the `TEMPLATES` array:

```typescript
{
  id: "my-new-template",           // unique kebab-case ID
  name: "My New Template",
  description: "Description of the template.",
  category: "modern",
  planRequired: "PRO",             // FREE | BASIC | PRO | ULTIMATE
  order: 15,                       // display order
  supportedFeatures: ["image", "animation"],
  defaultConfig: {
    ...defaultConfig,
    heading: "Default Heading",
    // override any default properties
  },
},
```

### 2. Add React preview renderer

In `web/frontend/src/components/editor/HeroPreview.tsx`, add a new `if` block:

```typescript
if (templateId === "my-new-template") {
  return (
    <section style={{ ...sectionStyle, background: getBackground() }}>
      {/* your HTML layout here */}
      <ContentBlock />
    </section>
  );
}
```

### 3. Add Liquid storefront rendering

In `extensions/zix-hero-sections/blocks/hero-section.liquid`:
- Add the new template to the `template_id` select options in the schema
- Add a rendering block in the main template:

```liquid
{% elsif block.settings.template_id == 'my-new-template' %}
  <div class="zix-hero__center">
    {%- render 'zix-hero-content', block: block -%}
  </div>
```

That's it! The configuration system, API, editor settings, and billing gating all work automatically.

---

## Plan System

| Plan | Monthly Price | Max Sections | Max Templates |
|---|---|---|---|
| FREE | $0 | 2 | 2 |
| BASIC | $9.99 | 5 | 5 |
| PRO | $19.99 | 9 | 9 |
| ULTIMATE | $39.99 | 14 | 14 |

### Template → Plan mapping

| Templates | Plan Required |
|---|---|
| Modern Split, Full Screen Image | FREE |
| Product Showcase, Fashion, Minimal | BASIC |
| Video, Gradient, Image CTA, Collection | PRO |
| Sale, Countdown, Before/After, Animated, Editorial | ULTIMATE |

### Downgrade behavior

When a merchant downgrades (e.g. PRO → FREE):
- Their section **data is preserved** — never deleted
- Excess sections are marked `LOCKED`
- Locked sections cannot be edited until the plan is upgraded again
- Merchant sees a clear explanation with an upgrade CTA

---

## Security

- **OAuth**: All Shopify OAuth flows use `@shopify/shopify-app-express` — session tokens are verified on every API request
- **Shop isolation**: Every query filters by `shopId` — merchants can never access other shops' data
- **Webhook verification**: Webhooks use HMAC-SHA256 signature verification
- **No secrets in frontend**: All Shopify credentials stay server-side
- **Input validation**: All inputs are validated with Zod schemas
- **Error handling**: Stack traces are never exposed to clients
- **Helmet.js**: HTTP security headers are set

---

## Support

For questions or issues: **support@zixhero.com**

Built with ❤️ for Shopify merchants.
