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
    apiVersion: "2026-07" as any,
    isEmbeddedApp: true,
  },
  useOnlineTokens: true,
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
app.get(shopify.config.auth.path, async (req, res, next) => {
  try {
    const shop = req.query["shop"];
    if (!shop) {
      res.status(400).send("No shop provided");
      return;
    }
    
    // Force online token request to bypass Shopify's block on non-expiring offline tokens
    await shopify.api.auth.begin({
      shop: shopify.api.utils.sanitizeShop(shop as string)!,
      callbackPath: shopify.config.auth.callbackPath,
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (err) {
    console.error("[Auth Begin] Error:", err);
    next(err);
  }
});
app.get(
  shopify.config.auth.callbackPath,
  async (req, res, next) => {
    try {
      // 1. Manually exchange the code using the underlying API to bypass authCallback
      const callbackResponse = await shopify.api.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      const session = callbackResponse.session;

      // 2. Store the session manually
      await shopify.config.sessionStorage.storeSession(session);
      res.locals["shopify"] = { ...res.locals["shopify"], session };

      // 3. Setup shop in our DB
      const { setupShop } = await import("./services/shopService.js");
      await setupShop(session);
      console.log("[Auth Callback] Shop setup complete:", session.shop);

      // 4. If we requested online tokens but got an offline one, kick off the online flow
      const useOnline = (shopify.config.auth as any).useOnlineTokens || true;
      if (useOnline && !session.isOnline) {
        console.log("[Auth Callback] Received offline token, redirecting to online token OAuth");
        await shopify.api.auth.begin({
          shop: session.shop,
          callbackPath: shopify.config.auth.callbackPath,
          isOnline: true,
          rawRequest: req,
          rawResponse: res,
        });
        return; // Stop execution, the response has been sent (redirected)
      }

      // 5. Proceed to redirect
      next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Auth Callback] Shopify OAuth error:", msg);
      // Even if it fails, try to redirect back to app so user isn't stuck on a blank page
      next();
    }
  },
  shopify.redirectToShopifyOrAppRoot()
);

// ---- Webhooks (must come before auth validation) ----
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
app.use("/api", shopify.validateAuthenticatedSession(), authRouter);
app.use("/api/sections", shopify.validateAuthenticatedSession(), sectionsRouter);
app.use("/api/templates", shopify.validateAuthenticatedSession(), templatesRouter);
app.use("/api/billing", shopify.validateAuthenticatedSession(), billingRouter);
app.use("/api/settings", shopify.validateAuthenticatedSession(), settingsRouter);
app.use("/api/shop", shopify.validateAuthenticatedSession(), shopRouter);

// Vercel's Edge Network serves them via vercel.json routing.
if (process.env["NODE_ENV"] !== "production") {
  // In dev, serve a redirect to the Vite dev server (without ensureInstalledOnShop)
  app.get("*", (_req, res, next) => {
    if (_req.originalUrl.startsWith("/api/")) return next();
    res.redirect(`http://localhost:3001${_req.originalUrl}`);
  });
}

// ---- Frontend Static Files & Catch-all ----
const frontendDist = path.join(__dirname, "../frontend/dist");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
} else {
  console.warn("Frontend dist folder not found. Run 'npm run build' in web/frontend.");
}

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
