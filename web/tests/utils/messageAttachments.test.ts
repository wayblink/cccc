import { describe, expect, it } from "vitest";
import {
  extractTextDocumentReferences,
  isImageAttachment,
  isRedundantWecomImagePlaceholder,
  isSvgAttachment,
  isTextEditableAttachment,
  MAX_TEXT_ATTACHMENT_BYTES,
} from "../../src/utils/messageAttachments";

describe("messageAttachments", () => {
  it("recognizes SVG attachments from mime type", () => {
    const attachment = {
      kind: "file",
      path: "state/blobs/sha_demo.svg",
      title: "demo.svg",
      mime_type: "image/svg+xml",
    };
    expect(isImageAttachment(attachment)).toBe(true);
    expect(isSvgAttachment(attachment)).toBe(true);
  });

  it("falls back to kind and extension when mime type is missing", () => {
    const attachment = {
      kind: "image",
      path: "state/blobs/sha_demo.svg",
      title: "demo.svg",
      mime_type: "",
    };
    expect(isImageAttachment(attachment)).toBe(true);
    expect(isSvgAttachment(attachment)).toBe(true);
  });

  it("does not treat generic files as images", () => {
    const attachment = {
      kind: "file",
      path: "state/blobs/sha_demo.txt",
      title: "demo.txt",
      mime_type: "text/plain",
    };
    expect(isImageAttachment(attachment)).toBe(false);
    expect(isSvgAttachment(attachment)).toBe(false);
  });

  it("hides redundant wecom image placeholders when image attachments exist", () => {
    const attachment = {
      kind: "image",
      path: "state/blobs/sha_demo.png",
      title: "demo.png",
      mime_type: "image/png",
    };
    expect(isRedundantWecomImagePlaceholder("[image]", [attachment], "wecom")).toBe(true);
    expect(isRedundantWecomImagePlaceholder("[file: unknown]", [attachment], "wecom")).toBe(true);
  });

  it("keeps non-wecom or non-image placeholder text visible", () => {
    const imageAttachment = {
      kind: "image",
      path: "state/blobs/sha_demo.png",
      title: "demo.png",
      mime_type: "image/png",
    };
    const fileAttachment = {
      kind: "file",
      path: "state/blobs/sha_demo.txt",
      title: "demo.txt",
      mime_type: "text/plain",
    };
    expect(isRedundantWecomImagePlaceholder("[image]", [imageAttachment], "telegram")).toBe(false);
    expect(isRedundantWecomImagePlaceholder("需要人工确认", [imageAttachment], "wecom")).toBe(false);
    expect(isRedundantWecomImagePlaceholder("[image]", [fileAttachment], "wecom")).toBe(false);
  });

  it("recognizes small text attachments from mime type or extension", () => {
    expect(
      isTextEditableAttachment({
        kind: "file",
        path: "state/blobs/sha_demo.txt",
        title: "demo.txt",
        mime_type: "text/plain",
        bytes: 128,
      }),
    ).toBe(true);
    expect(
      isTextEditableAttachment({
        kind: "file",
        path: "state/blobs/sha_payload",
        title: "payload.custom",
        mime_type: "application/merge-patch+json",
        bytes: 256,
      }),
    ).toBe(true);
  });

  it("rejects large or image attachments from text editing", () => {
    expect(
      isTextEditableAttachment({
        kind: "file",
        path: "state/blobs/sha_large.log",
        title: "large.log",
        mime_type: "text/plain",
        bytes: MAX_TEXT_ATTACHMENT_BYTES + 1,
      }),
    ).toBe(false);
    expect(
      isTextEditableAttachment({
        kind: "image",
        path: "state/blobs/sha_demo.png",
        title: "demo.png",
        mime_type: "image/png",
        bytes: 128,
      }),
    ).toBe(false);
  });

  it("extracts editable blob document paths from message text and de-duplicates attachment paths", () => {
    const refs = extractTextDocumentReferences(
      [
        "请查看 state/blobs/abc12345_notes.md 和 state/blobs/demo.pdf",
        "重复一次 state/blobs/abc12345_notes.md",
        "以及 state/blobs/9988_report.json",
      ].join("\n"),
      [{ path: "state/blobs/9988_report.json", title: "report.json", mime_type: "application/json" }],
    );

    expect(refs).toEqual([
      {
        kind: "file",
        path: "state/blobs/abc12345_notes.md",
        title: "notes.md",
        mime_type: "text/markdown",
      },
    ]);
  });

  it("extracts blob document paths from absolute filesystem paths in message text", () => {
    const refs = extractTextDocumentReferences(
      [
        "结果保存在",
        "`/Users/demo/.cccc/groups/g_demo/state/blobs/dee1159ba8c3eff90f56e033d4b19fc1720be0ef4b1f9b7bec70df54aca4bfe3_text-attachment-edit-1776306155.md`",
        "请查看。",
      ].join(" "),
    );

    expect(refs).toEqual([
      {
        kind: "file",
        path: "state/blobs/dee1159ba8c3eff90f56e033d4b19fc1720be0ef4b1f9b7bec70df54aca4bfe3_text-attachment-edit-1776306155.md",
        title: "text-attachment-edit-1776306155.md",
        mime_type: "text/markdown",
      },
    ]);
  });

  it("extracts a uniquely referenced text attachment from a bare filename in message text", () => {
    const refs = extractTextDocumentReferences(
      "请直接查看 text-attachment-edit-1776306155.md 这个文件",
      [
        {
          kind: "file",
          path: "state/blobs/dee1159_text-attachment-edit-1776306155.md",
          title: "text-attachment-edit-1776306155.md",
          mime_type: "text/markdown",
          bytes: 46,
        },
      ],
    );

    expect(refs).toEqual([
      {
        kind: "file",
        path: "state/blobs/dee1159_text-attachment-edit-1776306155.md",
        title: "text-attachment-edit-1776306155.md",
        mime_type: "text/markdown",
        bytes: 46,
      },
    ]);
  });

  it("does not extract a bare filename when multiple text attachments share the same title", () => {
    const refs = extractTextDocumentReferences(
      "请比较 notes.md 的两个版本",
      [
        {
          kind: "file",
          path: "state/blobs/aaa111_notes.md",
          title: "notes.md",
          mime_type: "text/markdown",
          bytes: 10,
        },
        {
          kind: "file",
          path: "state/blobs/bbb222_notes.md",
          title: "notes.md",
          mime_type: "text/markdown",
          bytes: 12,
        },
      ],
    );

    expect(refs).toEqual([]);
  });
});
