/**
 * Minimal declarations for @xenova/transformers.
 *
 * The package is intentionally NOT installed: wxt.config.ts marks it as
 * external and offscreen/main.ts imports it dynamically, falling back to a
 * friendly error when it is missing. Only the API surface actually used
 * (pipeline) is declared here.
 */
declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model?: string,
    options?: Record<string, unknown>,
  ): Promise<any>;
}
