// ============================================================
// Middleware — Error Handler
// ============================================================

import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[Error]", err.message, err.stack);

  // Shopify auth errors
  if (
    err.message?.includes("session") || 
    err.message?.includes("HMAC") ||
    err.message?.includes("GraphQL Client: Forbidden") ||
    err.message?.includes("Forbidden")
  ) {
    let shop = req.query["shop"] || req.headers["x-shopify-shop-domain"] || "";
    
    // Attempt to extract shop from session or Bearer token if missing
    if (!shop) {
      if (res.locals?.["shopify"]?.session?.shop) {
        shop = res.locals["shopify"].session.shop;
      } else if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split("Bearer ")[1];
          if (token) {
            const tokenParts = token.split(".");
            if (tokenParts.length > 1 && tokenParts[1]) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
              shop = payload.dest.replace("https://", "");
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    const authUrl = `/api/auth${shop ? `?shop=${shop}` : ""}`;
    
    res.setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", authUrl);
    res.status(403).json({
      success: false,
      error: "Your Shopify session has expired or requires new permissions. Please reinstall the app.",
      details: err.message, // Added for debugging
    });
    return;
  }

  // Validation errors
  if (err.name === "ZodError") {
    res.status(400).json({
      success: false,
      error: "Invalid request data. Please check your inputs.",
      details: err.message,
    });
    return;
  }

  // Database errors
  if (err.message?.includes("Prisma") || err.message?.includes("database")) {
    res.status(500).json({
      success: false,
      error: "Database error. Please try again.",
      details: err.message,
    });
    return;
  }

  // Generic error
  res.status(500).send(`
    <html>
      <head><title>App Error</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1 style="color: red;">App Error</h1>
        <p><strong>Error Message:</strong> ${err.message}</p>
        <pre style="background: #eee; padding: 1rem; overflow: auto;">${err.stack}</pre>
        <p>Please check your Vercel logs or contact support.</p>
      </body>
    </html>
  `);
}
