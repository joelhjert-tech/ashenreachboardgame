import { getApiOrigin } from "../../shared/network.js";

export interface AdminContentAuth {
  roomCode: string;
  hostToken: string;
}

export interface AdminContentStatus {
  enabled: boolean;
  editingAllowed: boolean;
  mode: "view-only" | "active-session-locked" | "edit-enabled";
  reason: string | null;
}

export interface AdminRevisionSummary {
  id: string;
  createdAt: string;
  sourcePath: string;
  fieldsChanged: string[];
  previousArtworkPath?: string;
  nextArtworkPath?: string;
}

export interface AdminCardSource {
  sourcePath: string;
  record: Record<string, unknown>;
  revision: string;
  artwork: {
    path: string | null;
    dimensions: { width: number; height: number } | null;
    sharedCount: number;
  };
  revisions: AdminRevisionSummary[];
  reloadRequired?: true;
}

export interface AdminArtworkDraft {
  dataBase64: string;
  fileName: string;
  mimeType: "image/png" | "image/webp" | "image/jpeg";
  replaceShared?: boolean;
}

async function postAdmin<T>(path: string, auth: AdminContentAuth, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${getApiOrigin()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...auth, ...body })
  });
  const payload = await response.json() as T & { error?: string; fieldErrors?: Record<string, string> };
  if (!response.ok) {
    const error = new Error(payload.error ?? "Admin content request failed") as Error & { fieldErrors?: Record<string, string> };
    error.fieldErrors = payload.fieldErrors;
    throw error;
  }
  return payload;
}

export function fetchAdminContentStatus(auth: AdminContentAuth): Promise<AdminContentStatus> {
  return postAdmin("/api/admin/content/status", auth);
}

export function fetchAdminCardSource(auth: AdminContentAuth, sourcePath: string): Promise<AdminCardSource> {
  return postAdmin("/api/admin/content/card", auth, { sourcePath });
}

export function saveAdminCardSource(
  auth: AdminContentAuth,
  input: { sourcePath: string; expectedRevision: string; record: Record<string, unknown>; artwork?: AdminArtworkDraft }
): Promise<AdminCardSource> {
  return postAdmin("/api/admin/content/save", auth, input);
}

export function revertAdminCardSource(
  auth: AdminContentAuth,
  input: { sourcePath: string; expectedRevision: string; revisionId: string }
): Promise<AdminCardSource> {
  return postAdmin("/api/admin/content/revert", auth, input);
}
