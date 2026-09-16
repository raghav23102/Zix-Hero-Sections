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
import fs from "fs";
import { fileURLToPath } from "url";
import { shopifyApp } from "@shopify/shopify-app-express";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { LATEST_API_VERSION } from "@shopify/shopify-api";

import { prisma } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { sectionsRouter } from "./routes/sections.js";
import { templatesRouter } from "./routes/templates.js";
import { billingRouter } from "./routes/billing.js";
import { settingsRouter } from "./routes/settings.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { shopRouter } from "./routes/shop.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupShop } from "./services/shopService.js";
import { requireAuth } from "./middleware/requireAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const SHOPIFY_APP_URL = process.env["SHOPIFY_APP_URL"] ?? "";

// ---- Shopify App Setup ----
const shopify = shopifyApp({
  api: {
    apiKey: process.env["SHOPIFY_API_KEY"] ?? "",
    apiSecretKey: process.env["SHOPIFY_API_SECRET"] ?? "",
    scopes: process.env.SCOPES ? process.env.SCOPES.split(",") : ["write_themes", "read_themes"],
    hostName: SHOPIFY_APP_URL.replace(/https?:\/\//, "").replace(/\/$/, ""),
    apiVersion: "2024-07" as any,
    isEmbeddedApp: true,
  },
  useOnlineTokens: false,
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new PrismaSessionStorage(prisma),
});

// ---- MONKEY PATCH ----
// Prevent the library from trying to register webhooks during the OAuth callback.
// This completely bypasses the '403 Forbidden' GraphQL Client error!
shopify.api.webhooks.register = async () => {
  console.log("[Auth Callback] Skipped library webhook registration to prevent 403 error.");
  return {};
};
// ----------------------

const app = express();

const logs: string[] = [];
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args: any[]) => {
  logs.push("ERROR: " + args.map(a => String(a)).join(" "));
  if (logs.length > 50) logs.shift();
  originalError.apply(console, args);
};
console.warn = (...args: any[]) => {
  logs.push("WARN: " + args.map(a => String(a)).join(" "));
  if (logs.length > 50) logs.shift();
  originalWarn.apply(console, args);
};

// Trust Vercel's proxy so Secure cookies are set correctly
app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    logs.push(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

app.use(morgan("combined"));
app.use(cookieParser());

// Webhooks need raw body for HMAC signature verification
// Only apply to POST requests to avoid affecting auth GET callbacks
app.post("/api/webhooks/*", express.raw({ type: "*/*", limit: "1mb" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- CORS: only for API routes during dev ----
if (process.env["NODE_ENV"] === "development") {
  app.use("/api", cors({ origin: "http://localhost:3001", credentials: true }));
}

// ---- Diagnostic Route ----
app.get("/api/diagnostic", async (req, res) => {
  try {
    const dbTest = await prisma.session.count().catch((e) => e.message);
    res.json({
      hasApiKey: !!process.env.SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      apiSecretLength: process.env.SHOPIFY_API_SECRET?.length || 0,
      hasAppUrl: !!process.env.SHOPIFY_APP_URL,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasScopes: !!process.env.SCOPES,
      scopes: process.env.SCOPES || "MISSING",
      dbStatus: typeof dbTest === "number" ? "Connected! Sessions count: " + dbTest : "DB Error: " + dbTest,
      cookies: req.cookies,
      appUrl: process.env.SHOPIFY_APP_URL || "MISSING",
      capturedLogs: logs
    });
  } catch (err) {
    res.json({ error: String(err) });
  }
});

// ---- Shopify auth middleware ----
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    try {
      const session = res.locals.shopify.session;
      if (session) {
        console.log(`[Auth Callback] Setting up shop in DB: ${session.shop}`);
        await setupShop(session);
        console.log(`[Auth Callback] Shop setup complete: ${session.shop}`);
      }
      next();
    } catch (err) {
      console.error("[Auth Callback] Error setting up shop in DB:", err);
      next(err);
    }
  },
  shopify.redirectToShopifyOrAppRoot()
);

// ---- Webhooks ----
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: {} })
);
app.use("/api/webhooks", webhooksRouter);

// ---- App Config Route for Frontend ----
app.get("/api/config", (req, res) => {
  const SHOPIFY_APP_URL = process.env["SHOPIFY_APP_URL"] ?? "";
  res.json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hostName: SHOPIFY_APP_URL.replace(/https?:\/\//, "").replace(/\/$/, "")
  });
});

// ---- API Routes (require Shopify session) ----
app.use("/api", requireAuth, authRouter);
app.use("/api/sections", requireAuth, sectionsRouter);
app.use("/api/templates", requireAuth, templatesRouter);
app.use("/api/billing", requireAuth, billingRouter);
app.use("/api/settings", requireAuth, settingsRouter);
app.use("/api/shop", requireAuth, shopRouter);

// Vercel's Edge Network serves them via vercel.json routing.
if (process.env["NODE_ENV"] !== "production") {
  // In dev, serve a redirect to the Vite dev server (without ensureInstalledOnShop)
  app.get("*", (_req, res, next) => {
    if (_req.originalUrl.startsWith("/api/")) return next();
    res.redirect(`http://localhost:3001${_req.originalUrl}`);
  });
}

// ---- Frontend Static Files & Catch-all ----
// After tsc compiles src/ → dist/server/, __dirname = web/dist/server/
// Vite builds frontend → web/dist/client/, so relative path is ../client
const frontendDist = path.join(__dirname, "../client");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
} else {
  console.warn("WARN: Frontend dist not found at", frontendDist, "— run 'npm run build' in web/");
}

// ---- Public Pages (Privacy Policy & Landing) ----
app.get(["/privacy", "/privacy-policy", "/privacy.html"], (_req, res) => {
  const candidatePaths = [
    path.join(frontendDist, "privacy.html"),
    path.join(__dirname, "../client/privacy.html"),
    path.join(__dirname, "../../frontend/public/privacy.html"),
  ];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate);
    }
  }
  return res.status(404).send("Privacy Policy not found");
});

app.use("/*", shopify.ensureInstalledOnShop(), async (req, res, _next) => {
  // If the path is an API path, return 404 to avoid returning HTML
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ success: false, error: "API route not found" });
  }
  
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(fs.readFileSync(path.join(frontendDist, "index.html")));
});

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
