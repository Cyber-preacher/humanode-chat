// Minimal Node polyfills for WHATWG fetch APIs used by Next server code
import { fetch, Request, Response, Headers, FormData, File } from "undici";

// Provide globals if not already there
// (Node 18+ usually has these, but this keeps Jest predictable)
if (!(globalThis as any).fetch) (globalThis as any).fetch = fetch as any;
if (!(globalThis as any).Request) (globalThis as any).Request = Request as any;
if (!(globalThis as any).Response) (globalThis as any).Response = Response as any;
if (!(globalThis as any).Headers) (globalThis as any).Headers = Headers as any;
if (!(globalThis as any).FormData) (globalThis as any).FormData = FormData as any;
if (!(globalThis as any).File) (globalThis as any).File = File as any;

// Give each test a generous default timeout for async chains
jest.setTimeout(15000);
