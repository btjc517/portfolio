// Type settings for Ben's name wherever it is set large: the hero, the footer wordmark and the
// PDF CV's header. One value, so they cannot drift apart. Ben asked twice for the name to be
// lighter (540, then 400, both "too heavy"), so it is Geist Light. scripts/site/check-type.cjs
// fails if any of the three is set heavier than this.
export const NAME_WEIGHT = 300;
/** Tracking that suits the light weight at display sizes, in em. */
export const NAME_TRACKING = -0.04;
