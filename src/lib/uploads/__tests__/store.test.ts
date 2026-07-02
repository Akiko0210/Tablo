// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  countUploadsForOwner,
  deleteUpload,
  getUpload,
  listUploadsForOwner,
  saveUpload,
} from "../store";

function ownerId() {
  return `owner-${Date.now()}-${Math.random()}`;
}

describe("saveUpload / getUpload", () => {
  it("assigns an id and timestamp and can be retrieved", () => {
    const owner = ownerId();
    const saved = saveUpload({
      ownerId: owner,
      mime: "image/png",
      filename: "menu.png",
      data: Buffer.from("fake-bytes"),
    });
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(getUpload(saved.id)?.filename).toBe("menu.png");
  });

  it("returns undefined for an unknown id", () => {
    expect(getUpload("does-not-exist")).toBeUndefined();
  });
});

describe("countUploadsForOwner / listUploadsForOwner", () => {
  it("isolates counts and lists per owner", () => {
    const a = ownerId();
    const b = ownerId();
    saveUpload({ ownerId: a, mime: "image/png", filename: "1.png", data: Buffer.from("x") });
    saveUpload({ ownerId: a, mime: "image/png", filename: "2.png", data: Buffer.from("x") });
    saveUpload({ ownerId: b, mime: "image/png", filename: "3.png", data: Buffer.from("x") });

    expect(countUploadsForOwner(a)).toBe(2);
    expect(countUploadsForOwner(b)).toBe(1);
    expect(listUploadsForOwner(a)).toHaveLength(2);
  });
});

describe("deleteUpload", () => {
  it("deletes an upload belonging to the requesting owner", () => {
    const owner = ownerId();
    const saved = saveUpload({
      ownerId: owner,
      mime: "image/png",
      filename: "menu.png",
      data: Buffer.from("x"),
    });
    expect(deleteUpload(saved.id, owner)).toBe(true);
    expect(getUpload(saved.id)).toBeUndefined();
  });

  it("refuses to delete another owner's upload", () => {
    const owner = ownerId();
    const intruder = ownerId();
    const saved = saveUpload({
      ownerId: owner,
      mime: "image/png",
      filename: "menu.png",
      data: Buffer.from("x"),
    });
    expect(deleteUpload(saved.id, intruder)).toBe(false);
    expect(getUpload(saved.id)).toBeDefined();
  });
});
