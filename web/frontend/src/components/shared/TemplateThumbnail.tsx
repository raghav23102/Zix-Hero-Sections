import React from "react";

interface Props {
  templateId: string;
  bgColor?: string;
  isLocked?: boolean;
}

const PLAN_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  FREE:     { bg: "#f0f9f0", accent: "#2e7d32", badge: "#e8f5e9" },
  BASIC:    { bg: "#e8f4fd", accent: "#1565c0", badge: "#bbdefb" },
  PRO:      { bg: "#fff8e1", accent: "#e65100", badge: "#ffe082" },
  ULTIMATE: { bg: "#f3e5f5", accent: "#6a1b9a", badge: "#e1bee7" },
};

function Block({ w, h, opacity = 0.25, radius = 3, color = "#1a1a1a" }: { w: string; h: string; opacity?: number; radius?: number; color?: string }) {
  return <div style={{ width: w, height: h, background: color, opacity, borderRadius: `${radius}px`, flexShrink: 0 }} />;
}

function TextLines({ count = 3, accent = "#1a1a1a" }: { count?: number; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: "5px", background: accent, opacity: 0.2, borderRadius: "3px", width: i === count - 1 ? "70%" : "100%" }} />
      ))}
    </div>
  );
}

function Btn({ accent }: { accent: string }) {
  return <div style={{ height: "14px", width: "44px", background: accent, opacity: 0.8, borderRadius: "4px" }} />;
}

export function TemplateThumbnail({ templateId, isLocked }: Props) {
  const getPlanForTemplate = (id: string): string => {
    const PRO_IDS = ["video-background", "before-after", "countdown", "animated"];
    const BASIC_IDS = ["product-showcase", "fashion", "image-cta", "collection", "sale"];
    const ULTIMATE_IDS = ["editorial"];
    if (ULTIMATE_IDS.includes(id)) return "ULTIMATE";
    if (PRO_IDS.includes(id)) return "PRO";
    if (BASIC_IDS.includes(id)) return "BASIC";
    return "FREE";
  };

  const plan = getPlanForTemplate(templateId);
  const { bg, accent } = PLAN_COLORS[plan];

  const containerStyle: React.CSSProperties = {
    height: "160px",
    background: bg,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: "20px",
  };

  const lockedOverlay = isLocked && (
    <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(2px)", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a1a1a", color: "#fff", borderRadius: "20px", padding: "4px 14px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>🔒 LOCKED</div>
    </div>
  );

  // Render different wireframes per template
  const render = (): React.ReactNode => {
    switch (templateId) {

      case "modern-split":
      case "image-cta":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%", gap: "12px", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <Block w="60%" h="10px" opacity={0.7} color={accent} />
              <TextLines accent={accent} />
              <div style={{ marginTop: "6px" }}><Btn accent={accent} /></div>
            </div>
            <Block w="90px" h="100px" opacity={0.18} color={accent} radius={6} />
          </div>
        );

      case "fullscreen-image":
        return (
          <div style={{ ...containerStyle, padding: 0, position: "relative" }}>
            <Block w="100%" h="100%" opacity={0.15} color={accent} radius={0} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Block w="70%" h="12px" opacity={0.7} color={accent} radius={4} />
              <TextLines count={2} accent={accent} />
              <Btn accent={accent} />
            </div>
          </div>
        );

      case "video-background":
        return (
          <div style={{ ...containerStyle, padding: 0, position: "relative" }}>
            <Block w="100%" h="100%" opacity={0.15} color={accent} radius={0} />
            {/* Play button */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", border: `2px solid ${accent}`, opacity: 0.5, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${accent}`, opacity: 0.7, marginLeft: "3px" }} />
              </div>
              <Block w="60%" h="10px" opacity={0.7} color={accent} radius={4} />
              <Block w="50%" h="6px" opacity={0.3} color={accent} radius={3} />
            </div>
          </div>
        );

      case "product-showcase":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%", gap: "14px", alignItems: "center" }}>
            <Block w="80px" h="110px" opacity={0.18} color={accent} radius={6} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <Block w="75%" h="11px" opacity={0.7} color={accent} radius={4} />
              <Block w="35%" h="14px" opacity={0.9} color={accent} radius={4} />
              <TextLines count={2} accent={accent} />
              <div style={{ marginTop: "4px" }}><Btn accent={accent} /></div>
            </div>
          </div>
        );

      case "fashion":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%", gap: "8px", alignItems: "center" }}>
            <Block w="70px" h="130px" opacity={0.18} color={accent} radius={4} />
            <Block w="70px" h="110px" opacity={0.12} color={accent} radius={4} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <Block w="80%" h="10px" opacity={0.7} color={accent} radius={4} />
              <TextLines count={2} accent={accent} />
              <Btn accent={accent} />
            </div>
          </div>
        );

      case "minimal":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "10px" }}>
            <Block w="40px" h="40px" opacity={0.1} color={accent} radius={50} />
            <Block w="65%" h="11px" opacity={0.7} color={accent} radius={4} />
            <Block w="80%" h="5px" opacity={0.2} color={accent} radius={3} />
            <Btn accent={accent} />
          </div>
        );

      case "gradient":
        return (
          <div style={{ ...containerStyle, padding: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)` }} />
            {/* Decorative blobs */}
            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: accent, opacity: 0.1 }} />
            <div style={{ position: "absolute", bottom: "-20px", left: "-20px", width: "60px", height: "60px", borderRadius: "50%", background: accent, opacity: 0.08 }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "65%" }}>
              <Block w="80%" h="11px" opacity={0.8} color={accent} radius={4} />
              <TextLines count={2} accent={accent} />
              <Btn accent={accent} />
            </div>
          </div>
        );

      case "collection":
        return (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "10px" }}>
            <Block w="55%" h="10px" opacity={0.7} color={accent} radius={4} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Block w="65px" h="65px" opacity={0.18} color={accent} radius={6} />
              <Block w="65px" h="65px" opacity={0.12} color={accent} radius={6} />
              <Block w="65px" h="65px" opacity={0.08} color={accent} radius={6} />
            </div>
            <Btn accent={accent} />
          </div>
        );

      case "sale":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "8px" }}>
            <div style={{ background: accent, color: "#fff", borderRadius: "20px", padding: "3px 12px", fontSize: "9px", fontWeight: 700, opacity: 0.85 }}>SALE</div>
            <Block w="70%" h="12px" opacity={0.7} color={accent} radius={4} />
            <TextLines count={2} accent={accent} />
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <Btn accent={accent} />
              <div style={{ height: "14px", width: "44px", border: `1.5px solid ${accent}`, opacity: 0.6, borderRadius: "4px" }} />
            </div>
          </div>
        );

      case "countdown":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "8px" }}>
            <Block w="60%" h="10px" opacity={0.7} color={accent} radius={4} />
            <TextLines count={1} accent={accent} />
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              {["00", "00", "00", "00"].map((_, i) => (
                <div key={i} style={{ width: "24px", height: "24px", background: accent, opacity: 0.75, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "12px", height: "5px", background: "#fff", borderRadius: "2px", opacity: 0.6 }} />
                </div>
              ))}
            </div>
            <Btn accent={accent} />
          </div>
        );

      case "before-after":
        return (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "10px" }}>
            <Block w="55%" h="10px" opacity={0.7} color={accent} radius={4} />
            <div style={{ display: "flex", height: "80px", borderRadius: "8px", overflow: "hidden", border: `1px solid ${accent}33` }}>
              <div style={{ flex: 1, background: accent, opacity: 0.1 }} />
              <div style={{ width: "3px", background: accent, opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: accent, opacity: 0.8, marginLeft: "-5.5px" }} />
              </div>
              <div style={{ flex: 1, background: accent, opacity: 0.22 }} />
            </div>
          </div>
        );

      case "animated":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "8px" }}>
            {/* Floating shapes */}
            <div style={{ position: "relative", width: "100%", height: "80px", marginBottom: "4px" }}>
              <div style={{ position: "absolute", top: "10px", left: "20px", width: "40px", height: "40px", borderRadius: "50%", background: accent, opacity: 0.12 }} />
              <div style={{ position: "absolute", top: "20px", right: "15px", width: "30px", height: "30px", background: accent, opacity: 0.08, borderRadius: "6px", transform: "rotate(15deg)" }} />
              <div style={{ position: "absolute", bottom: "5px", left: "40%", width: "50px", height: "10px", background: accent, opacity: 0.6, borderRadius: "3px" }} />
            </div>
            <TextLines count={2} accent={accent} />
            <Btn accent={accent} />
          </div>
        );

      case "editorial":
        return (
          <div style={{ display: "flex", width: "100%", height: "100%", gap: "2px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "8px", background: accent, opacity: 0.12, borderRadius: "4px 0 0 4px" }} />
            <div style={{ flex: 2, display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px", gap: "8px" }}>
              <Block w="80%" h="12px" opacity={0.7} color={accent} radius={4} />
              <TextLines count={2} accent={accent} />
              <Btn accent={accent} />
            </div>
          </div>
        );

      default:
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "10px" }}>
            <Block w="65%" h="11px" opacity={0.7} color={accent} radius={4} />
            <TextLines accent={accent} />
            <Btn accent={accent} />
          </div>
        );
    }
  };

  return (
    <div style={containerStyle}>
      {lockedOverlay}
      {render()}
    </div>
  );
}
