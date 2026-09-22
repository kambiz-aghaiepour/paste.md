import { Marp } from "@marp-team/marp-core";

// Presentation layout and typography only. Resource-loading and legacy
// executable CSS are excluded; Marp escapes the returned attribute values.
const styleProperties = new Set(
  `align-content align-items align-self aspect-ratio background background-color
   border border-top border-right border-bottom border-left border-color
   border-style border-width border-radius box-shadow box-sizing color
   column-gap display flex flex-basis flex-direction flex-flow flex-grow
   flex-shrink flex-wrap font font-family font-size font-style font-weight
   gap grid grid-area grid-auto-columns grid-auto-flow grid-auto-rows
   grid-column grid-column-end grid-column-start grid-row grid-row-end
   grid-row-start grid-template grid-template-areas grid-template-columns
   grid-template-rows height width min-height min-width max-height max-width
   justify-content justify-items justify-self letter-spacing line-height
   margin margin-top margin-right margin-bottom margin-left object-fit
   opacity order overflow overflow-x overflow-y overflow-wrap padding
   padding-top padding-right padding-bottom padding-left place-content
   place-items place-self position top right bottom left row-gap text-align
   text-decoration text-indent text-overflow text-shadow text-transform
   transform transform-origin vertical-align visibility white-space
   word-break word-spacing word-wrap z-index fill stroke stroke-width`.split(
    /\s+/,
  ),
);

function safeStyleValue(value: string): string {
  // Reject escapes and comments as well as literal resource/expression syntax,
  // so CSS token obfuscation cannot bypass the checks.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: reject control characters in untrusted CSS
  return /[\\<>@{}\u0000-\u0008\u000b\u000e-\u001f]|\/\*|\*\/|(?:url|src|expression|image|image-set)\s*\(|(?:java|vb)script\s*:/i.test(
    value,
  )
    ? ""
    : value;
}

function presentationStyle(style: string): string {
  return style
    .split(";")
    .flatMap((declaration) => {
      const colon = declaration.indexOf(":");
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = safeStyleValue(declaration.slice(colon + 1).trim());
      return colon > 0 && styleProperties.has(property) && value
        ? [`${property}: ${value}`]
        : [];
    })
    .join("; ");
}

// Keep Marp's HTML and URL filters, adding only filtered inline styles.
export const marpHtmlAllowList: typeof Marp.html = Object.fromEntries(
  Object.entries(Marp.html).map(([tag, attributes]) => [
    tag,
    {
      ...(Array.isArray(attributes)
        ? Object.fromEntries(attributes.map((name) => [name, true]))
        : attributes),
      style: presentationStyle,
    },
  ]),
);

function svgPaint(value: string): string {
  // Gradients, masks, clipping and markers may reference this document only.
  return /^url\(\s*['"]?#[\w:.-]+['"]?\s*\)$/i.test(value)
    ? value
    : safeStyleValue(value);
}

// Static drawings only: no scripts, event handlers, foreignObject, animation,
// external references, or data-marpit-svg attributes in user-authored SVG.
const svgAttributes = Object.fromEntries(
  `id class role aria-label aria-hidden viewbox preserveaspectratio width height
   x y x1 y1 x2 y2 cx cy r rx ry d points dx dy transform opacity
   fill-opacity fill-rule stroke-width stroke-opacity stroke-linecap
   stroke-linejoin stroke-dasharray stroke-dashoffset stroke-miterlimit
   font-family font-size font-weight text-anchor dominant-baseline
   gradientunits gradienttransform offset stop-color stop-opacity
   clippathunits maskunits maskcontentunits markerwidth markerheight
   markerunits refx refy orient`
    .split(/\s+/)
    .map((name) => [name, true]),
);

for (const tag of [
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "marker",
  "title",
  "desc",
]) {
  marpHtmlAllowList[tag] = {
    ...svgAttributes,
    style: presentationStyle,
    fill: svgPaint,
    stroke: svgPaint,
    "clip-path": svgPaint,
    mask: svgPaint,
    "marker-start": svgPaint,
    "marker-mid": svgPaint,
    "marker-end": svgPaint,
  };
}
