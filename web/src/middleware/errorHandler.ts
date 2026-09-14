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
  if (err.message?.includes("Shopify") || err.message?.includes("session")) {
    res.status(401).json({
      success: false,
      error: "Your Shopify session has expired. Please reinstall the app.",
    });
    return;
  }

  // Validation errors
  if (err.name === "ZodError") {
    res.status(400).json({
      success: false,
      error: "Invalid request data. Please check your inputs.",
    });
    return;
  }

  // Database errors
  if (err.message?.includes("Prisma") || err.message?.includes("database")) {
    res.status(500).json({
      success: false,
      error: "Database error. Please try again.",
    });
    return;
  }

  // Generic error — never expose stack traces
  res.status(500).json({
    success: false,
    error: "Something went wrong. Please try again.",
  });
}
