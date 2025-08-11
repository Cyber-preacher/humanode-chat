/* eslint-disable @typescript-eslint/no-explicit-any */

import { TextEncoder, TextDecoder } from 'node:util';

(global as any).TextEncoder = TextEncoder as any;
(global as any).TextDecoder = TextDecoder as any;

export {};
