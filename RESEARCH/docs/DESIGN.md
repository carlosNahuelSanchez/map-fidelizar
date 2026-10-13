---
name: Relevamiento
description: Provincial map interface for consulting locations across Argentina.
colors:
  accent-teal: "#16877f"
  accent-terracotta: "#c86e52"
  accent-ochre: "#c39a36"
  page-paper: "#f4f6f3"
  map-field: "#edf2ee"
  text-primary: "#25342f"
  text-heading: "#20332d"
  text-muted: "#788780"
  text-subtle: "#89958f"
  border-soft: "#dce3de"
  province-neutral: "#dfe7e2"
  control-surface: "#fbfcfa"
  control-dark: "#253d35"
typography:
  display:
    fontFamily: "Avenir Next, Avenir, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Avenir Next, Avenir, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Avenir Next, Avenir, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "Avenir Next, Avenir, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  marker: "3px"
  tooltip: "7px"
  brand-mark: "8px"
  map-control: "9px"
  retry-button: "10px"
  map-frame: "14px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  section: "32px"
  page: "40px"
  page-wide: "48px"
components:
  province-selector:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    padding: "12px 0"
    height: "56px"
  retry-button:
    backgroundColor: "{colors.control-dark}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.retry-button}"
    padding: "10px 16px"
  map-frame:
    backgroundColor: "{colors.map-field}"
    rounded: "{rounded.map-frame}"
---

# Design System: Relevamiento

## Overview

**Creative North Star: “The Provincial Field Map”**

The name describes the implemented surface: a national province map paired with a compact consultation panel. The interface is quiet and information-led, using a pale green-gray canvas, restrained borders, and small controls so provincial boundaries remain the focus. Leaflet (BSD-2-Clause) renders the interactive geometry inside the React surface.

The current map highlights Formosa, Córdoba, and Buenos Aires with separate key colors over OpenStreetMap streets and labels. Translucent province fills preserve the street detail underneath. The boundary and basemap sources are credited in the interface. There are no locale markers because location records have not been supplied; future location data should enter as sourced geographic information within this existing map context.

**Key Characteristics:**
- Muted, green-tinted neutrals around a prominent provincial map.
- Three distinct colors identify the requested provinces.
- Compact labels, thin dividers, and restrained control shadows.
- Location content appears only when its source data is available.

## Colors

The palette uses a teal anchor, two warm map highlights, and low-contrast green-gray surfaces and dividers.

### Primary
- **Survey Teal**: Used for Formosa, keyboard focus, small status accents, and interactive emphasis.

### Secondary
- **Terracotta**: Identifies Córdoba in the map, province list, and color key.

### Tertiary
- **Ochre**: Identifies Buenos Aires in the map, province list, and color key.

### Neutral
- **Paper Green**: Main page background.
- **Map Mist**: Map field and its loading surface.
- **Forest Ink**: Default body text; the deeper heading tone marks primary titles.
- **Sage Gray**: Supporting labels and explanatory copy.
- **Soft Divider**: Header, footer, and list separators.
- **Province Mist**: Fill for provinces without a highlight color.
- **Control White**: Zoom-control surface; **Deep Green** supports the map tooltip and retry action.

**The Source-True Map Rule.** Keep the three existing highlight colors tied to their named provinces, and show locale marks only after coordinates and associated data have a known source.

## Typography

**Display Font:** Avenir Next (with Avenir, Segoe UI, sans-serif fallbacks)  
**Body Font:** Avenir Next (with Avenir, Segoe UI, sans-serif fallbacks)  
**Label/Mono Font:** No separate label or mono family is used.

**Character:** A single sans-serif family keeps headings, map labels, and controls cohesive. Compact uppercase section labels use tracking for hierarchy; supporting copy stays regular and readable.

### Hierarchy
- **Display** (600, 30px / 36px at the small breakpoint, 1.05 line-height): Main page heading; grows from 30px to 36px.
- **Title** (600, 18px, default line-height): Map section title.
- **Body** (400, 14px, 20–24px line-height): Descriptions, province names, and action labels.
- **Label** (600, 12px, 0.12em tracking, uppercase): Small section heading; map metadata also uses compact 12px text.
- **Microcopy** (400–500, 11–12px): Source notes, helper text, and status details.

## Layout

The page is centered in a maximum 1600px container, with horizontal padding that steps from 20px on narrow screens to 32px and 48px at larger breakpoints. Content stacks into one column until the large breakpoint, then uses a 248px information rail beside a flexible map with a 48px gap. At smaller widths, the source note moves to a compact footer.

The map frame fills available height while keeping a 440px minimum, increasing to 550px at the small breakpoint and 660px on large screens. Spacing follows a compact 8px rhythm, with 16px control and list spacing and larger 24–48px section gaps. The map remains the dominant surface.

## Elevation & Depth

Depth comes mainly from tonal layering and fine borders. There are no large card shadows. The map zoom control and tooltip use small shadows to remain legible over geographic content; selection is communicated through color, fill opacity, and outline weight. Motion is brief and limited to map focus, hover opacity, and the loading indicator; reduced-motion preferences shorten animations and transitions.

### Shadow Vocabulary
- **Map control** (`0 3px 14px rgb(37 52 47 / 10%)`): Keeps the zoom control distinct from map detail.
- **Map tooltip** (`0 3px 12px rgb(37 52 47 / 18%)`): Separates the province label from the map beneath it.

## Shapes

The form language uses gently rounded rectangular surfaces with thin pale borders. The map frame has the largest radius; the brand mark, zoom controls, tooltip, and retry action use progressively smaller corners. Province swatches are compact rounded squares. Province boundaries use softly joined strokes, with white separation between neighboring provinces.

## Components

### Buttons
- **Province selector:** A full-width, 56px-high text row with a colored square swatch, province name, and “Ver” / “En foco” state. Rows are separated by thin dividers; hover darkens the text and keyboard focus uses the teal outline.
- **Retry:** A compact deep-green action with white medium-weight text, 10px corners, and 16px horizontal padding. It slightly compresses when pressed and has a visible teal keyboard focus outline.
- **Return to country:** A text action with teal underline, used when a province is focused.

### Cards / Containers
- **Map frame:** A clipped map surface with a fine border and 14px corners. It contains the geographic map, loading/error states, and a small source credit anchored to the lower-left edge. Tile provider attribution remains visible at the lower-right edge.

### Navigation
- **Header:** A restrained wordmark link on the left and an Argentina context label on wider screens. A thin divider separates it from the page; the country label is hidden on narrow screens.

### Map Controls
- **Zoom:** Light square controls with a fine border, 9px corners, and a quiet shadow. Hover adds a pale green surface and teal text.
- **Province tooltip:** A compact deep-green label with white semibold text, 7px corners, and a soft shadow.
- **Province geometry:** Unhighlighted provinces use a neutral fill; the three requested provinces use the named map colors. Selection increases fill opacity and outline weight, and the map fits the selected province into view.

## Do's and Don'ts

### Do:
- **Do** keep Formosa, Córdoba, and Buenos Aires mapped to their existing teal, terracotta, and ochre colors.
- **Do** credit geographic boundaries and keep supporting information visually quieter than the map.
- **Do** add future location marks only from supplied coordinate and location records.
- **Do** preserve visible keyboard focus and reduced-motion behavior when extending interactive controls.

### Don't:
- **Don't** place illustrative or sample locale markers on the map before location data is supplied.
- **Don't** use the province highlight colors for unrelated meanings without updating the map key.
- **Don't** add a heavy card treatment that competes with the provincial map.
