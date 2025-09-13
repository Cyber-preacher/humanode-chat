// apps/web/src/lib/api/chat.ts
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.string(),
  chat_id: z.string(),
  sender_address: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Back-compat alias (some components import `Message`)
export type Message = ChatMessage;

const GetResponseSchema = z.object({
  ok: z.literal(true),
  messages: z.array(ChatMessageSchema),
});

const PostResponseSchema = z.object({
  ok: z.literal(true),
  message: ChatMessageSchema,
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.unknown(),
});

type MaybeErr<T> = z.infer<typeof ErrorResponseSchema> | T;

function toQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/** New primary API */
export async function fetchMessages(
  chatSlug: string,
  opts?: { limit?: number },
): Promise<ChatMessage[]> {
  const qs = toQuery({ limit: opts?.limit });
  const res = await fetch(`/api/chats/${encodeURIComponent(chatSlug)}/messages${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const json = (await res.json()) as MaybeErr<z.infer<typeof GetResponseSchema>>;

  const errParsed = ErrorResponseSchema.safeParse(json);
  if (errParsed.success) {
    throw new Error(String(errParsed.data.error ?? 'Unknown error'));
  }

  const okParsed = GetResponseSchema.parse(json);
  return okParsed.messages;
}

export async function postMessage(
  chatSlug: string,
  dto: { senderAddress: string; body: string },
): Promise<ChatMessage> {
  const res = await fetch(`/api/chats/${encodeURIComponent(chatSlug)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(dto),
  });

  const json = (await res.json()) as MaybeErr<z.infer<typeof PostResponseSchema>>;

  const errParsed = ErrorResponseSchema.safeParse(json);
  if (!res.ok || errParsed.success) {
    throw new Error(String(errParsed.success ? errParsed.data.error : 'Request failed'));
  }

  const okParsed = PostResponseSchema.parse(json);
  return okParsed.message;
}

/* ----------------------------------------------------
   Back-compat exports for older imports in components
   ---------------------------------------------------- */

/** Accepts either `{ limit }` or a bare number like `50` */
export function requireGetChatMessages(
  chatSlug: string,
  optsOrLimit?: { limit?: number } | number,
): Promise<ChatMessage[]> {
  const opts = typeof optsOrLimit === 'number' ? { limit: optsOrLimit } : optsOrLimit ?? undefined;
  return fetchMessages(chatSlug, opts);
}

/** Alias for older call sites expecting this name */
export const requirePostChatMessage = postMessage;
