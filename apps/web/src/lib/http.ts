// apps/web/src/lib/http.ts
import { NextResponse } from "next/server";

/**
 * Uniform API response helpers.
 * - Success: { ok: true, ...payload }
 * - Error:   { ok: false, error: string, details?: unknown }
 */

export type ApiOk<T extends object = Record<string, unknown>> = { ok: true } & T;
export type ApiErr = { ok: false; error: string; details?: unknown };

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** 200 OK */
export function ok<T extends object>(payload: T, init?: ResponseInit): Response {
  return NextResponse.json<ApiOk<T>>({ ok: true, ...payload }, { status: 200, ...(init ?? {}) });
}

/** 201 Created */
export function created<T extends object>(payload: T, init?: ResponseInit): Response {
  return NextResponse.json<ApiOk<T>>({ ok: true, ...payload }, { status: 201, ...(init ?? {}) });
}

/** 400 Bad Request */
export function badRequest(message: string, details?: unknown): Response {
  return NextResponse.json<ApiErr>({ ok: false, error: message, ...(details ? { details } : {}) }, { status: 400 });
}

/** 404 Not Found */
export function notFound(message = "Not found"): Response {
  return NextResponse.json<ApiErr>({ ok: false, error: message }, { status: 404 });
}

/** 429 Too Many Requests */
export function tooMany(message = "Rate limit exceeded"): Response {
  return NextResponse.json<ApiErr>({ ok: false, error: message }, { status: 429 });
}

/** 500 Internal Error */
export function serverError(err: unknown): Response {
  const msg = toErrorMessage(err);
  return NextResponse.json<ApiErr>({ ok: false, error: msg }, { status: 500 });
}
