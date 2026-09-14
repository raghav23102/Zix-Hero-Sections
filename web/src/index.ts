// ============================================================
// ZIX HERO SECTIONS — Express Server Entry Point
// ============================================================

import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { shopifyApp } from "@shopify/shopify-app-express";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { ApiVersion } from "@shopify/shopify-api";

import { prisma } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { sectionsRouter } from "./routes/sections.js";
import { templatesRouter } from "./routes/templates.js";
import { billingRouter } from "./routes/billing.js";
import { settingsRouter } from "./routes/settings.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { shopRouter } from "./routes/shop.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const SHOPIFY_APP_URL = process.env["SHOPIFY_APP_URL"] ?? "";

// ---- Shopify App Setup ----
const shopify = shopifyApp({
  api: {
    apiKey: process.env["SHOPIFY_API_KEY"] ?? "",
    apiSecretKey: process.env["SHOPIFY_API_SECRET"] ?? "",
    scopes: (process.env["SCOPES"] ?? "").split(","),
    hostName: SHOPIFY_APP_URL.replace(/https?:\/\//, ""),
    apiVersion: "2026-07" as any,
    isEmbeddedApp: true,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new PrismaSessionStorage(prisma),
});

const app = express();



app.use(morgan("combined"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- CORS: only for API routes during dev ----
if (process.env["NODE_ENV"] === "development") {
  app.use("/api", cors({ origin: "http://localhost:3001", credentials: true }));
}

// ---- Shopify auth middleware ----
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    // After OAuth completes, set up the shop in our DB
    try {
      const session = res.locals["shopify"]?.session;
      if (session) {
        const { setupShop } = await import("./services/shopService.js");
        await setupShop(session);
      }
    } catch (err) {
      console.error("[Auth Callback] Shop setup error:", err);
    }
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);

// ---- Webhooks (must come before auth validation) ----
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: {} })
);
app.use("/api/webhooks", webhooksRouter);

// ---- API Routes (require Shopify session) ----
app.use("/api", shopify.validateAuthenticatedSession(), authRouter);
app.use("/api/sections", shopify.validateAuthenticatedSession(), sectionsRouter);
app.use("/api/templates", shopify.validateAuthenticatedSession(), templatesRouter);
app.use("/api/billing", shopify.validateAuthenticatedSession(), billingRouter);
app.use("/api/settings", shopify.validateAuthenticatedSession(), settingsRouter);
app.use("/api/shop", shopify.validateAuthenticatedSession(), shopRouter);

// ---- Public Landing Page Interceptor ----
app.get("/", (req, res, next) => {
  if (req.query.shop) {
    // App launched from Shopify Admin. Let the wildcard route handle it.
    return next();
  }
  // Public visit without shop query param. Serve the landing page.
  const landingPagePath = path.resolve(__dirname, "../client/landing.html");
  if (process.env["NODE_ENV"] === "production") {
    return res.sendFile(landingPagePath);
  } else {
    return res.redirect(`http://localhost:3001/landing.html`);
  }
});

// ---- Serve React App in Production ----
const clientDistPath = path.resolve(__dirname, "../client");
const htmlPath = path.resolve(__dirname, "index.html");
if (process.env["NODE_ENV"] === "production") {
  app.use(express.static(clientDistPath, { maxAge: "1y" }));
  app.get("*", shopify.ensureInstalledOnShop(), (_req, res) => {
    res.sendFile(htmlPath);
  });
} else {
  // In dev, serve a redirect to the Vite dev server
  app.get("*", shopify.ensureInstalledOnShop(), (_req, res) => {
    res.redirect(`http://localhost:3001${_req.path}`);
  });
}

// ---- Error Handler ----
app.use(errorHandler);

if (process.env["VERCEL"] !== "1") {
  app.listen(PORT, () => {
    console.log(`\n🚀 Zix Hero Sections server running on port ${PORT}`);
    console.log(`   Environment: ${process.env["NODE_ENV"] ?? "development"}`);
    console.log(`   App URL: ${SHOPIFY_APP_URL}`);
  });
}

export { shopify };
export default app;
