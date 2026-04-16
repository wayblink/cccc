import type { MessageAttachment } from "../types";

const IMAGE_ATTACHMENT_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".avif",
]);

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".jsonl",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".log",
  ".csv",
  ".tsv",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".env",
  ".sql",
]);

const TEXT_ATTACHMENT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
  "application/x-sh",
  "application/javascript",
  "application/x-javascript",
  "application/typescript",
  "application/x-typescript",
]);

const TEXT_ATTACHMENT_MIME_SUFFIXES = ["+json", "+xml", "+yaml"];
const BLOB_DOCUMENT_PATH_SEGMENT_PATTERN = /state\/blobs\/[A-Za-z0-9][A-Za-z0-9._-]*\.[A-Za-z0-9][A-Za-z0-9.+_-]*/;
const LEADING_TOKEN_BOUNDARY_PATTERN = /^[`"'([{<]$/;
const TRAILING_TOKEN_BOUNDARY_PATTERN = /^[`"',.;:!?)\]}>\\]$/;

export type TextDocumentReferenceMatch = {
  attachment: MessageAttachment;
  matchedText: string;
  start: number;
  end: number;
};

export const MAX_TEXT_ATTACHMENT_BYTES = 1024 * 1024;

function attachmentPathOrName(attachment: MessageAttachment): string {
  return String(attachment.path || attachment.title || "").trim().toLowerCase();
}

function attachmentExtension(attachment: MessageAttachment): string {
  const raw = attachmentPathOrName(attachment);
  const queryIndex = raw.indexOf("?");
  const clean = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return "";
  return clean.slice(dot);
}

function attachmentMimeType(attachment: MessageAttachment): string {
  return String(attachment.mime_type || "").trim().toLowerCase();
}

function normalizeDocumentToken(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return deriveAttachmentTitle(raw).trim().toLowerCase();
}

function trimTokenBoundaries(token: string): { startOffset: number; endOffset: number } {
  let startOffset = 0;
  let endOffset = token.length;

  while (startOffset < endOffset && LEADING_TOKEN_BOUNDARY_PATTERN.test(token[startOffset] || "")) {
    startOffset += 1;
  }
  while (endOffset > startOffset && TRAILING_TOKEN_BOUNDARY_PATTERN.test(token[endOffset - 1] || "")) {
    endOffset -= 1;
  }

  return { startOffset, endOffset };
}

function buildSyntheticDocumentAttachment(path: string): MessageAttachment {
  const title = deriveAttachmentTitle(path);
  return {
    kind: "file",
    path,
    title,
    mime_type: title.endsWith(".md") || title.endsWith(".markdown")
      ? "text/markdown"
      : title.endsWith(".json")
        ? "application/json"
        : "",
  };
}

function buildAttachmentReferenceLookup(attachments: MessageAttachment[]): Map<string, MessageAttachment | null> {
  const lookup = new Map<string, MessageAttachment | null>();

  for (const attachment of attachments) {
    if (!isTextEditableAttachment(attachment)) continue;
    const path = String(attachment.path || "").trim();
    if (!path) continue;

    const names = new Set<string>([
      normalizeDocumentToken(String(attachment.title || "")),
      normalizeDocumentToken(path),
      normalizeDocumentToken(deriveAttachmentTitle(path)),
    ]);

    for (const name of names) {
      if (!name) continue;
      const existing = lookup.get(name);
      if (!lookup.has(name)) {
        lookup.set(name, attachment);
        continue;
      }
      if (!existing || String(existing.path || "").trim() !== path) {
        lookup.set(name, null);
      }
    }
  }

  return lookup;
}

export function deriveAttachmentTitle(pathOrTitle: string): string {
  const raw = String(pathOrTitle || "").trim();
  if (!raw) return "";
  const normalized = raw.split("?")[0] || raw;
  const parts = normalized.split("/");
  const basename = parts[parts.length - 1] || normalized;
  const underscoreIndex = basename.indexOf("_");
  if (underscoreIndex > 0 && underscoreIndex < basename.length - 1) {
    const prefix = basename.slice(0, underscoreIndex);
    if (/^[a-f0-9]{6,}$/i.test(prefix)) {
      return basename.slice(underscoreIndex + 1);
    }
  }
  return basename;
}

export function isImageAttachment(attachment: MessageAttachment): boolean {
  const kind = String(attachment.kind || "").trim().toLowerCase();
  if (kind === "image") return true;
  const mime = attachmentMimeType(attachment);
  if (mime.startsWith("image/")) return true;
  return IMAGE_ATTACHMENT_EXTENSIONS.has(attachmentExtension(attachment));
}

export function isSvgAttachment(attachment: MessageAttachment): boolean {
  const mime = attachmentMimeType(attachment);
  if (mime === "image/svg+xml") return true;
  return attachmentExtension(attachment) === ".svg";
}

export function isTextEditableAttachment(attachment: MessageAttachment): boolean {
  if (isImageAttachment(attachment)) return false;
  const bytes = Number(attachment.bytes || 0);
  if (Number.isFinite(bytes) && bytes > MAX_TEXT_ATTACHMENT_BYTES) return false;

  const mime = attachmentMimeType(attachment);
  if (mime.startsWith("text/")) return true;
  if (TEXT_ATTACHMENT_MIME_TYPES.has(mime)) return true;
  if (TEXT_ATTACHMENT_MIME_SUFFIXES.some((suffix) => mime.endsWith(suffix))) return true;

  return TEXT_ATTACHMENT_EXTENSIONS.has(attachmentExtension(attachment));
}

export function extractTextDocumentReferences(
  text: string,
  attachments: MessageAttachment[] = [],
): MessageAttachment[] {
  const existingPaths = new Set(
    attachments
      .map((attachment) => String(attachment.path || "").trim())
      .filter((path) => path.length > 0),
  );
  const seenPaths = new Set<string>();
  const refs: MessageAttachment[] = [];

  for (const match of extractTextDocumentReferenceMatches(text, attachments)) {
    const attachmentPath = String(match.attachment.path || "").trim();
    if (!attachmentPath || seenPaths.has(attachmentPath)) continue;
    if (existingPaths.has(attachmentPath) && match.matchedText.includes("state/blobs/")) continue;
    seenPaths.add(attachmentPath);
    refs.push({ ...match.attachment });
  }

  return refs;
}

export function extractTextDocumentReferenceMatches(
  text: string,
  attachments: MessageAttachment[] = [],
): TextDocumentReferenceMatch[] {
  const content = String(text || "");
  if (!content) return [];
  const attachmentLookup = buildAttachmentReferenceLookup(attachments);
  const refs: TextDocumentReferenceMatch[] = [];
  const tokenPattern = /\S+/g;
  let tokenMatch: RegExpExecArray | null = tokenPattern.exec(content);

  while (tokenMatch) {
    const rawToken = String(tokenMatch[0] || "");
    const tokenStart = Number(tokenMatch.index || 0);
    const { startOffset, endOffset } = trimTokenBoundaries(rawToken);
    if (startOffset < endOffset) {
      const token = rawToken.slice(startOffset, endOffset);
      const matchedStart = tokenStart + startOffset;
      const matchedEnd = tokenStart + endOffset;
      const blobMatch = token.match(BLOB_DOCUMENT_PATH_SEGMENT_PATTERN);
      const attachmentPath = blobMatch?.[0] || "";

      if (attachmentPath) {
        const attachment = buildSyntheticDocumentAttachment(attachmentPath);
        if (isTextEditableAttachment(attachment)) {
          refs.push({
            attachment,
            matchedText: token,
            start: matchedStart,
            end: matchedEnd,
          });
        }
      } else {
        const normalizedToken = normalizeDocumentToken(token);
        const attachment = attachmentLookup.get(normalizedToken);
        const path = String(attachment?.path || "").trim();
        if (attachment && path) {
          refs.push({
            attachment: { ...attachment },
            matchedText: token,
            start: matchedStart,
            end: matchedEnd,
          });
        }
      }
    }

    tokenMatch = tokenPattern.exec(content);
  }

  return refs;
}

export function isRedundantWecomImagePlaceholder(
  text: string,
  attachments: MessageAttachment[],
  sourcePlatform?: string,
): boolean {
  if (String(sourcePlatform || "").trim().toLowerCase() !== "wecom") return false;
  if (!attachments.length || !attachments.every((attachment) => isImageAttachment(attachment))) return false;
  const normalized = String(text || "").trim().toLowerCase();
  return normalized === "[image]" || /^\[file(?:: [^\]]+)?\](?:\s+\S+)?$/.test(normalized);
}
