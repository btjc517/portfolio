// Type settings for Ben's name wherever it is set large. The hero and the PDF CV's header set it
// as type: Ben asked for it lighter three times (540, 400, 300), so it is Geist ExtraLight.
// The footer wordmark draws it in characters, where bold is right: thick strokes fill with a
// texture of characters. Ben asked for it bolder twice (600, 700), so it is Geist ExtraBold.
// scripts/site/check-type.cjs guards both.
export const NAME_WEIGHT = 200;
/** The footer wordmark, the name drawn in characters. */
export const WORDMARK_WEIGHT = 800;
/** Tracking that suits the light weight at display sizes, in em. */
export const NAME_TRACKING = -0.032;
