// Type settings for Ben's name wherever it is set large. The hero and the PDF CV's header set it
// as type: Ben asked twice for it lighter (540, then 400, both "too heavy"), so it is Geist Light.
// The footer wordmark draws it in characters, where bold is right: thick strokes fill with a
// texture of characters, and Ben liked it that way. scripts/site/check-type.cjs guards both.
export const NAME_WEIGHT = 300;
/** The footer wordmark, the name drawn in characters. */
export const WORDMARK_WEIGHT = 600;
/** Tracking that suits the light weight at display sizes, in em. */
export const NAME_TRACKING = -0.04;
