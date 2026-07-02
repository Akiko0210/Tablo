import { describe, it, expect } from "vitest";
import { validateUploadFile, MAX_FILE_BYTES } from "../limits";

describe("validateUploadFile", () => {
  it("accepts an allowed type under the size limit", () => {
    expect(validateUploadFile({ type: "image/png", size: 1024 })).toEqual({
      ok: true,
    });
  });

  it("rejects a disallowed mime type", () => {
    const result = validateUploadFile({ type: "application/pdf", size: 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateUploadFile({ type: "image/png", size: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateUploadFile({
      type: "image/png",
      size: MAX_FILE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateUploadFile({ type: "image/jpeg", size: MAX_FILE_BYTES }).ok,
    ).toBe(true);
  });
});
