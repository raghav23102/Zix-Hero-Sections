// ============================================================
// Hero Preview Component — Renders any template given a config
// This is the core rendering engine used in the editor preview.
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import type { HeroConfig } from "@shared/types";

interface HeroPreviewProps {
  templateId: string;
  config: HeroConfig;
  previewMode?: "desktop" | "tablet" | "mobile";
}

// Countdown hook
function useCountdown(endDate?: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!endDate) return;
    const target = new Date(endDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return { timeLeft, expired };
}

// Before/After slider hook
function useBeforeAfter() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return { sliderPos, containerRef, handleMouseDown, handleMouseUp, handleMouseMove };
}

// Font size map
const HEADING_SIZES: Record<string, string> = {
  sm: "24px", md: "32px", lg: "42px", xl: "52px", "2xl": "64px", "3xl": "80px",
};
const DESC_SIZES: Record<string, string> = { sm: "14px", md: "16px", lg: "20px" };
const FONT_WEIGHTS: Record<string, string | number> = {
  normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
};

export function HeroPreview({ templateId, config, previewMode = "desktop" }: HeroPreviewProps) {
  const { timeLeft, expired } = useCountdown(config.countdownEndDate);
  const { sliderPos, containerRef, handleMouseDown, handleMouseUp, handleMouseMove } = useBeforeAfter();

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const shouldAnimate = config.enableAnimation && !prefersReducedMotion;

  // Computed styles
  const sectionHeight = config.sectionHeight ?? "600px";
  const textAlign = config.textAlignment ?? "left";
  const headingColor = config.headingColor ?? "#ffffff";
  const textColor = config.textColor ?? "#ffffff";
  const headingSize = HEADING_SIZES[config.headingSize ?? "xl"] ?? "52px";
  const headingWeight = FONT_WEIGHTS[config.headingWeight ?? "bold"] ?? 700;
  const descSize = DESC_SIZES[config.descriptionSize ?? "md"] ?? "16px";
  const paddingTop = previewMode === "mobile"
    ? (config.mobilePaddingTop ?? 60) + "px"
    : (config.desktopPaddingTop ?? 80) + "px";
  const paddingBottom = previewMode === "mobile"
    ? (config.mobilePaddingBottom ?? 60) + "px"
    : (config.desktopPaddingBottom ?? 80) + "px";

  const animationStyle = shouldAnimate && config.animationType !== "none"
    ? {
        animationName: config.animationType === "fade"
          ? "zix-fade-in"
          : config.animationType === "slide-up"
          ? "zix-slide-up"
          : config.animationType === "slide-left"
          ? "zix-slide-left"
          : "zix-fade-in",
        animationDuration: `${config.animationDuration ?? 800}ms`,
        animationDelay: `${config.animationDelay ?? 0}ms`,
        animationFillMode: "both" as const,
        animationTimingFunction: "ease-out",
      }
    : {};

  // Background computation
  const getBackground = () => {
    if (config.backgroundGradientStart && config.backgroundGradientEnd) {
      const angle = config.backgroundGradientAngle ?? 135;
      return `linear-gradient(${angle}deg, ${config.backgroundGradientStart}, ${config.backgroundGradientEnd})`;
    }
    if (config.backgroundImage) {
      return `url(${config.backgroundImage}) center/cover no-repeat`;
    }
    return config.backgroundColor ?? "#1a1a2e";
  };

  // CTA Buttons
  const PrimaryButton = () =>
    config.primaryButtonText ? (
      <a
        href="#preview"
        style={{
          display: "inline-block",
          background: config.primaryButtonColor ?? "#000",
          color: config.primaryButtonTextColor ?? "#fff",
          padding: config.primaryButtonSize === "small" ? "8px 16px" : config.primaryButtonSize === "large" ? "16px 32px" : "12px 24px",
          borderRadius: (config.primaryButtonBorderRadius ?? 4) + "px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "15px",
          border: "none",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onClick={(e) => e.preventDefault()}
      >
        {config.primaryButtonText}
      </a>
    ) : null;

  const SecondaryButton = () =>
    config.secondaryButtonText ? (
      <a
        href="#preview"
        style={{
          display: "inline-block",
          background: config.secondaryButtonColor ?? "transparent",
          color: config.secondaryButtonTextColor ?? headingColor,
          padding: "12px 24px",
          borderRadius: (config.secondaryButtonBorderRadius ?? 4) + "px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "15px",
          border: `2px solid ${config.secondaryButtonTextColor ?? headingColor}`,
          cursor: "pointer",
        }}
        onClick={(e) => e.preventDefault()}
      >
        {config.secondaryButtonText}
      </a>
    ) : null;

  // Content block
  const ContentBlock = () => (
    <div style={{ ...animationStyle, textAlign: textAlign }}>
      {config.badgeText && (
        <div style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.2)",
          color: headingColor,
          padding: "4px 16px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: "16px",
          border: "1px solid rgba(255,255,255,0.3)",
        }}>
          {config.badgeText}
        </div>
      )}
      {config.subheading && (
        <p style={{ color: textColor, opacity: 0.8, fontSize: "14px", fontWeight: 600, letterSpacing: "0.1em", marginBottom: "8px", textTransform: "uppercase" }}>
          {config.subheading}
        </p>
      )}
      <h1 style={{ color: headingColor, fontSize: headingSize, fontWeight: headingWeight, lineHeight: 1.1, margin: "0 0 16px" }}>
        {config.heading ?? "Beautiful Hero Section"}
      </h1>
      {config.description && (
        <p style={{ color: textColor, fontSize: descSize, lineHeight: 1.7, margin: "0 0 32px", maxWidth: "540px", ...(textAlign === "center" ? { margin: "0 auto 32px" } : {}) }}>
          {config.description}
        </p>
      )}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" }}>
        <PrimaryButton />
        <SecondaryButton />
      </div>
    </div>
  );

  // Image block
  const ImageBlock = ({ style }: { style?: React.CSSProperties }) =>
    config.imageUrl ? (
      <img
        src={config.imageUrl}
        alt={config.imageAlt ?? "Hero image"}
        style={{ width: "100%", height: "100%", objectFit: config.imageFit ?? "cover", borderRadius: "8px", display: "block", ...style }}
        loading="lazy"
      />
    ) : (
      <div style={{ width: "100%", height: "300px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
        Add an image
      </div>
    );

  // Overlay
  const Overlay = () =>
    config.overlayOpacity && config.overlayOpacity > 0 ? (
      <div style={{
        position: "absolute", inset: 0,
        background: config.overlayColor ?? "#000",
        opacity: config.overlayOpacity ?? 0.4,
        pointerEvents: "none",
      }} />
    ) : null;

  // Section container
  const sectionStyle: React.CSSProperties = {
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: sectionHeight,
    paddingTop,
    paddingBottom,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    width: "100%",
  };

  // ---- TEMPLATE RENDERERS ----

  // Template 1: Modern Split
  if (templateId === "modern-split") {
    const isImageLeft = config.imagePosition === "left";
    return (
      <section style={{ ...sectionStyle, background: getBackground(), display: "flex", alignItems: "center" }}>
        <div style={{
          display: "flex",
          flexDirection: previewMode === "mobile" ? "column" : (isImageLeft ? "row-reverse" : "row"),
          alignItems: "center",
          gap: "48px",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: `0 ${config.contentPaddingX ?? 40}px`,
          boxSizing: "border-box",
        }}>
          <div style={{ flex: 1 }}><ContentBlock /></div>
          <div style={{ flex: 1, minHeight: "300px" }}><ImageBlock /></div>
        </div>
      </section>
    );
  }

  // Template 2: Fullscreen Image
  if (templateId === "fullscreen-image") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
        justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto", padding: `0 ${config.contentPaddingX ?? 40}px`, width: "100%", boxSizing: "border-box" }}>
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 3: Video Background
  if (templateId === "video-background") {
    return (
      <section style={{ ...sectionStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {config.videoUrl ? (
          <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}>
            <source src={config.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a1a2e, #0f3460)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "48px" }}>🎬</span>
          </div>
        )}
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 4: Product Showcase
  if (templateId === "product-showcase") {
    return (
      <section style={{ ...sectionStyle, background: getBackground(), display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: previewMode === "mobile" ? "column" : "row", alignItems: "center", gap: "48px", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          <div style={{ flex: 1 }}>
            <ImageBlock style={{ maxHeight: "400px" }} />
          </div>
          <div style={{ flex: 1, ...animationStyle }}>
            {config.productTitle && <p style={{ color: textColor, opacity: 0.7, fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Featured</p>}
            <h1 style={{ color: headingColor, fontSize: headingSize, fontWeight: headingWeight, lineHeight: 1.1, margin: "0 0 16px" }}>
              {config.productTitle ?? config.heading ?? "Product Title"}
            </h1>
            {config.productPrice && (
              <p style={{ color: headingColor, fontSize: "32px", fontWeight: 700, margin: "0 0 16px" }}>{config.productPrice}</p>
            )}
            {config.productDescription && (
              <p style={{ color: textColor, fontSize: descSize, lineHeight: 1.7, margin: "0 0 32px" }}>{config.productDescription}</p>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <PrimaryButton />
              <SecondaryButton />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Template 5: Fashion
  if (templateId === "fashion") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "flex-end",
        paddingBottom: "60px",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, padding: `0 ${config.contentPaddingX ?? 60}px`, width: "100%", boxSizing: "border-box" }}>
          <div style={{ ...animationStyle, maxWidth: "600px" }}>
            {config.subheading && <p style={{ color: textColor, opacity: 0.8, fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>{config.subheading}</p>}
            <h1 style={{ color: headingColor, fontSize: headingSize, fontWeight: headingWeight, lineHeight: 1.0, margin: "0 0 24px" }}>
              {config.heading ?? "Fashion Hero"}
            </h1>
            <div style={{ display: "flex", gap: "12px" }}><PrimaryButton /><SecondaryButton /></div>
          </div>
        </div>
      </section>
    );
  }

  // Template 6: Minimal
  if (templateId === "minimal") {
    return (
      <section style={{ ...sectionStyle, background: config.backgroundColor ?? "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...animationStyle, textAlign: "center", maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          <h1 style={{ color: config.headingColor ?? "#1a1a1a", fontSize: headingSize, fontWeight: headingWeight, lineHeight: 1.05, margin: "0 0 24px" }}>
            {config.heading ?? "Beautifully Simple."}
          </h1>
          {config.description && (
            <p style={{ color: config.textColor ?? "#555", fontSize: descSize, lineHeight: 1.7, margin: "0 0 40px" }}>{config.description}</p>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}><PrimaryButton /><SecondaryButton /></div>
        </div>
      </section>
    );
  }

  // Template 7: Gradient
  if (templateId === "gradient") {
    return (
      <section style={{ ...sectionStyle, background: getBackground(), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Decorative shapes */}
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "250px", height: "250px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "800px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 8: Image + CTA
  if (templateId === "image-cta") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", padding: `0 ${config.contentPaddingX ?? 60}px`, boxSizing: "border-box" }}>
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 9: Collection
  if (templateId === "collection") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          {config.collectionTitle && (
            <p style={{ color: textColor, opacity: 0.75, fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
              {config.collectionTitle}
            </p>
          )}
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 10: Sale
  if (templateId === "sale") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          {config.badgeText && (
            <div style={{ display: "inline-block", background: "#fff", color: config.backgroundColor ?? "#c0392b", padding: "6px 24px", borderRadius: "24px", fontSize: "14px", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "24px" }}>
              {config.badgeText}
            </div>
          )}
          <ContentBlock />
          {config.discountText && (
            <p style={{ color: textColor, opacity: 0.8, fontSize: "14px", marginTop: "16px", fontStyle: "italic" }}>{config.discountText}</p>
          )}
        </div>
      </section>
    );
  }

  // Template 11: Countdown
  if (templateId === "countdown") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "800px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          {expired ? (
            <h2 style={{ color: headingColor, fontSize: "32px", fontWeight: 700 }}>
              {config.countdownCompletionMessage ?? "The offer has ended."}
            </h2>
          ) : (
            <>
              <ContentBlock />
              <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "32px" }}>
                {[
                  { label: "Days", value: timeLeft.days },
                  { label: "Hours", value: timeLeft.hours },
                  { label: "Minutes", value: timeLeft.minutes },
                  { label: "Seconds", value: timeLeft.seconds },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "16px 20px", minWidth: "70px" }}>
                      <div style={{ color: headingColor, fontSize: "40px", fontWeight: 800, lineHeight: 1 }}>
                        {String(value).padStart(2, "0")}
                      </div>
                    </div>
                    <p style={{ color: textColor, fontSize: "11px", marginTop: "6px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // Template 12: Before & After
  if (templateId === "before-after") {
    return (
      <section style={{ ...sectionStyle, background: getBackground(), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px" }}>
        <div style={{ textAlign: "center", padding: `0 ${config.contentPaddingX ?? 40}px` }}>
          <ContentBlock />
        </div>
        <div
          ref={containerRef}
          style={{ position: "relative", width: "min(600px, 90%)", height: "300px", borderRadius: "12px", overflow: "hidden", cursor: "ew-resize", userSelect: "none" }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
        >
          {/* After */}
          {config.afterImageUrl ? (
            <img src={config.afterImageUrl} alt="After" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#4CAF50", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: 700 }}>AFTER</div>
          )}
          {/* Before (clipped) */}
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
            {config.beforeImageUrl ? (
              <img src={config.beforeImageUrl} alt="Before" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ background: "#e0e0e0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "20px", fontWeight: 700 }}>BEFORE</div>
            )}
          </div>
          {/* Slider handle */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderPos}%`, transform: "translateX(-50%)", width: "3px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", fontSize: "16px" }}>↔</div>
          </div>
        </div>
      </section>
    );
  }

  // Template 13: Animated
  if (templateId === "animated") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        <Overlay />
        {/* Floating elements */}
        {shouldAnimate && (
          <>
            <div style={{ position: "absolute", top: "20%", left: "10%", width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", animation: "zix-float 4s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "15%", right: "8%", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", animation: "zix-float 6s ease-in-out infinite" }} />
          </>
        )}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
          <ContentBlock />
        </div>
      </section>
    );
  }

  // Template 14: Editorial
  if (templateId === "editorial") {
    return (
      <section style={{
        ...sectionStyle,
        background: config.imageUrl ? `url(${config.imageUrl}) center/cover no-repeat` : getBackground(),
        display: "flex",
        alignItems: "center",
      }}>
        <Overlay />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: previewMode === "mobile" ? "column" : "row", alignItems: "center", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: `0 ${config.contentPaddingX ?? 80}px`, boxSizing: "border-box", gap: "48px" }}>
          <div style={{ flex: 1 }}>
            {config.subheading && <p style={{ color: textColor, opacity: 0.6, fontSize: "11px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "24px" }}>{config.subheading}</p>}
            <h1 style={{ color: headingColor, fontSize: headingSize, fontWeight: headingWeight, lineHeight: 1.0, margin: "0 0 32px" }}>
              {config.heading ?? "Editorial Hero"}
            </h1>
            {config.description && <p style={{ color: textColor, opacity: 0.75, fontSize: descSize, lineHeight: 1.8, margin: "0 0 40px", maxWidth: "400px" }}>{config.description}</p>}
            <div style={{ display: "flex", gap: "16px" }}><PrimaryButton /><SecondaryButton /></div>
          </div>
        </div>
      </section>
    );
  }

  // Fallback
  return (
    <section style={{ ...sectionStyle, background: getBackground(), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Overlay />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "700px", padding: `0 ${config.contentPaddingX ?? 40}px`, boxSizing: "border-box" }}>
        <ContentBlock />
      </div>
    </section>
  );
}
