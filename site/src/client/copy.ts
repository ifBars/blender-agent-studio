/** Copies a button's source and shows success only after the clipboard accepts it. */
export async function copyButton(button: HTMLButtonElement): Promise<void> {
  const { copyText, copySrc } = button.dataset;
  try {
    let text = copyText;
    if (text === undefined && copySrc) {
      const response = await fetch(copySrc);
      if (!response.ok) return;
      text = await response.text();
    }
    text ??= button.parentElement?.querySelector("pre")?.textContent ?? undefined;
    if (!text) return;
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  button.classList.add("copied");
  setTimeout(() => button.classList.remove("copied"), 1600);
}
