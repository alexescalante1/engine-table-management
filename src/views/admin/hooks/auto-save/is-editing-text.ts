/** Agnostic check: is the user currently in a text field? */
export function isUserEditingText(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}
