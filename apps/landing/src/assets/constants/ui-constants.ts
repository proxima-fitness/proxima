/** User-facing messages and error copy. */
export const PROFANITY_ERROR_MESSAGE = "Content contains profanity that does not meet our community guidelines";

/** NSFW detection threshold for profile pictures (score >= this value rejects the image). */
export const PROFILE_PICTURE_NSFW_THRESHOLD = 0.97;

/** Error message when profile picture fails NSFW check. */
export const PROFILE_PICTURE_NSFW_MESSAGE = "Image does not meet our community guideline standards";

/** Reason shown when an exercise is skipped during Hevy upload (not in library). */
export const HEVY_OMIT_REASON = "Exercise not found in library and will be omitted from your saved program.";

/** Error message when Hevy upload fails after rate-limit retries. */
export const RATE_LIMIT_EXHAUSTED_MESSAGE = "Upload failed. Rate limited after 3 retries.";

/** Prompt used for blind-spot stall analysis. */
export const STALL_PROMPT = "I have stalled on this exercise can you modify my existing program to fix this plateau. Check my existing program first and then make changes you think would fix this plateau. Explain to me what you're going to do. Then return three new lines then ask me `Would you like me to make these changes to your program now?` and then exit.";

export const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
export const SIDEBAR_SIZE_KEY = "andy-sidebar-size";
export const PENDING_ATTACHMENTS_KEY = "pending-attachments";
export const PENDING_INITIAL_PROMPT_KEY = "pending-initial-prompt";
export const LONG_PROMPT_PLACEHOLDER = "__long_prompt__";
export const COLLAPSED_SIZE = 30;
export const EXPANDED_SIZE = 100;
export const CHAT_MESSAGES_KEY = "messages";

export const MAIN_DISCOUNT_CODE = "SUMMER40";
export const MAIN_DISCOUNT_PERCENT = 40;

/** Shown after a successful Calendly product-feedback booking on /pricing; create a matching Stripe promotion. */
export const DISCOVERY_DISCOUNT_CODE = "R95KMTWY";
export const DISCOVERY_DISCOUNT_PERCENT = 95;

/** Default Calendly event when `NEXT_PUBLIC_CALENDLY_URL` is unset (product feedback chat). */
export const DEFAULT_CALENDLY_SCHEDULING_URL = "https://calendly.com/jack-proximafitness/product-feedback-chat";
