import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "whatwg-fetch";

afterEach(() => cleanup());

// TextEncoder/TextDecoder (Node util)
if (!globalThis.TextEncoder || !globalThis.TextDecoder) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("node:util");
  // @ts-ignore
  globalThis.TextEncoder = TextEncoder;
  // @ts-ignore
  globalThis.TextDecoder = TextDecoder;
}

// matchMedia
if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// crypto.getRandomValues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeCrypto = require("node:crypto");
if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
  // @ts-ignore
  globalThis.crypto = nodeCrypto.webcrypto;
}
