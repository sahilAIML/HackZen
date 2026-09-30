# CashRouteAI &mdash; Design System & UI/UX Architecture

## 1. Design Vision & Aesthetics: Premium Claymorphism

CashRouteAI is designed to bridge **high-reliability fintech operations** and **tactile next-generation AI control**. Rather than relying on generic flat dashboard templates or childish 3D aesthetics, CashRouteAI introduces **tactile, soft 3D claymorphic surfaces**:

- **Tactility**: Soft multi-layered diffuse drop shadows combined with subtle top-left inner highlights (`inset 1px 1px 1px rgba(255, 255, 255, 0.95)`).
- **Physical Feedback**: Raised buttons that visibly press down on click (`transform: translateY(1px); box-shadow: inset ...`), providing immediate physical assurance during live dispatch commands.
- **Visual Warmth**: A balanced light ivory/warm gray palette (`#f0f3f8`) prevents operator visual fatigue while contrasting sharply against crisp white elevated cards (`#ffffff`).

---

## 2. Harmonious Color Palette

| Token | Hex | Role | Usage |
|---|---|---|---|
| **Background** | `#f0f3f8` | Primary Application Surface | Low-strain background |
| **Card Surface** | `#ffffff` | Elevated Clay Containers | Content modules & panels |
| **Inset Surface** | `#edf2f8` | Recessed Sunken Wells | Metrics boxes & input fields |
| **Primary Indigo** | `#5b50eb` | Primary Action & Brand Accent | Dispatch buttons, active tabs |
| **Electric Blue** | `#2563eb` | Secondary System Feedback | Vehicle tracking & links |
| **Emerald** | `#10b981` | Safe Operational Status | Low risk, safe dispatch badge |
| **Amber** | `#f59e0b` | Caution & Telemetry Warning | Medium/High risk, traffic alerts |
| **Coral / Crimson** | `#ef4444` | Critical Stockout Hazard | Stockout alarms, pulsing markers |

---

## 3. Typography Hierarchy

- **Primary UI Typeface**: `Plus Jakarta Sans` via Google Fonts. Clean geometric curves, legible at micro-sizes.
- **Telemetry & Financial Data**: `JetBrains Mono`. Monospace alignment ensures timestamps, coordinates, currency amounts (`₹`), and vehicle IDs are scannable without optical drift.
- **Hierarchy**:
  - Hero Metrics: 1.85rem (800 weight)
  - Section Headings: 1.15rem – 1.3rem (800 weight)
  - Micro-Labels: 0.72rem – 0.76rem (700 weight, uppercase, letter-spacing +0.05em)

---

## 4. Reusable Clay Components

1. **ClayCard**: Rounded 24px container with dual-layer diffuse shadow and top-left specular highlight.
2. **ClayButton**: Tactile button with floating elevation on hover and sunken depression on active click.
3. **ClayBadge**: Pill-shaped status indicator with subtle 1px border and tinted background.
4. **ClayMetricCard**: Compact KPI card with colored accent header indicating operational health.
5. **ClayDrawer**: Smooth right-docked sliding drawer displaying detailed ATM telemetry and interactive forecast charts without losing map context.
6. **ClayTable**: Clean borderless table with subtle row-hover shading and monospace numerical columns.

---

## 5. Explainability & Human-in-the-Loop AI

A central tenet of CashRouteAI is **explainable optimization**:
- **Why is ATM-103 Critical?**: Breaks down current cash, forecasted demand, 30% safety reserve, and exact shortage calculation.
- **Why this Refill Amount?**: Explains how cash bundles respect physical cassette headroom.
- **Why Dispatch Blocked?**: Pinpoints exact violated hard constraints (e.g., transit insurance limit or blocked corridors) instead of generic error codes.
