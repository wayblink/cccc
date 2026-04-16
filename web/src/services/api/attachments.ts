import type { EventAttachment } from "../../types";
import { apiJson, type ApiResponse } from "./base";

export type TextAttachmentContent = {
  path: string;
  title: string;
  mime_type: string;
  bytes: number;
  content: string;
};

export type SaveTextAttachmentInput = {
  filename: string;
  content: string;
  mimeType?: string;
};

export async function fetchTextAttachment(groupId: string, path: string) {
  const params = new URLSearchParams({
    path: String(path || "").trim(),
  });
  return apiJson<TextAttachmentContent>(
    `/api/v1/groups/${encodeURIComponent(groupId)}/attachments/text?${params.toString()}`,
  );
}

export async function saveTextAttachment(groupId: string, input: SaveTextAttachmentInput) {
  const payload = {
    filename: String(input.filename || "").trim(),
    content: String(input.content || ""),
    mime_type: String(input.mimeType || "").trim(),
  };
  return apiJson<{ attachment: EventAttachment }>(
    `/api/v1/groups/${encodeURIComponent(groupId)}/attachments/text/save`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  ) as Promise<ApiResponse<{ attachment: EventAttachment }>>;
}
