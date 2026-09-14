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
  if (err.message?.includes("session") || err.message?.includes("HMAC")) {
    res.status(401).json({
      success: false,
      error: "Your Shopify session has expired. Please reinstall the app.",
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
  res.status(500).json({
    success: false,
    error: "Something went wrong. Please try again.",
    details: err.message,
  });
}
