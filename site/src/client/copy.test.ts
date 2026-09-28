import { afterEach, expect, mock, test } from "bun:test";
import { copyButton } from "./copy";

const originalFetch = globalThis.fetch;
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const timers: ReturnType<typeof setTimeout>[] = [];
const originalTimeout = globalThis.setTimeout;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
  if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  else Reflect.deleteProperty(navigator, "clipboard");
  timers.splice(0).forEach(clearTimeout);
});

function setup(dataset: { copyText?: string; copySrc?: string }, code?: string) {
  const classes = new Set<string>();
  const writeText = mock(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    const timer = originalTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }) as typeof setTimeout;
  const button = {
    dataset,
    parentElement: { querySelector: () => code === undefined ? null : { textContent: code } },
    classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
  } as unknown as HTMLButtonElement;
  return { button, classes, writeText };
}

test("copies fetched Markdown and marks success after the write", async () => {
  const { button, classes, writeText } = setup({ copySrc: "/docs/install.md" });
  const request = mock(async () => new Response("# Installation"));
  globalThis.fetch = request as unknown as typeof fetch;
  writeText.mockImplementation(async () => { expect(classes.has("copied")).toBe(false); });
  await copyButton(button);
  expect(request).toHaveBeenCalledWith("/docs/install.md");
  expect(writeText).toHaveBeenCalledWith("# Installation");
  expect(classes.has("copied")).toBe(true);
});

test("does not copy an HTTP error page or fall back to nearby code", async () => {
  const { button, classes, writeText } = setup({ copySrc: "/missing.md" }, "nearby code");
  globalThis.fetch = mock(async () => new Response("<h1>Not found</h1>", { status: 404 })) as unknown as typeof fetch;
  await copyButton(button);
  expect(writeText).not.toHaveBeenCalled();
  expect(classes.has("copied")).toBe(false);
});

test("handles network failure without copying or reporting success", async () => {
  const { button, classes, writeText } = setup({ copySrc: "/install.md" });
  globalThis.fetch = mock(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
  await copyButton(button);
  expect(writeText).not.toHaveBeenCalled();
  expect(classes.has("copied")).toBe(false);
});

test("handles clipboard rejection without reporting success", async () => {
  const { button, classes, writeText } = setup({ copyText: "install commands" });
  writeText.mockImplementation(async () => { throw new Error("permission denied"); });
  await copyButton(button);
  expect(writeText).toHaveBeenCalledWith("install commands");
  expect(classes.has("copied")).toBe(false);
});

test("explicit text takes precedence over a Markdown source", async () => {
  const { button, writeText } = setup({ copyText: "install commands", copySrc: "/install.md" });
  const request = mock(async () => new Response("ignored"));
  globalThis.fetch = request as unknown as typeof fetch;
  await copyButton(button);
  expect(request).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenCalledWith("install commands");
});

test("copies the nearby code block when no explicit source exists", async () => {
  const { button, writeText } = setup({}, "bun run check");
  await copyButton(button);
  expect(writeText).toHaveBeenCalledWith("bun run check");
});

test("does not copy or report success for an empty source", async () => {
  const { button, classes, writeText } = setup({ copyText: "" }, "nearby code");
  await copyButton(button);
  expect(writeText).not.toHaveBeenCalled();
  expect(classes.has("copied")).toBe(false);
});
