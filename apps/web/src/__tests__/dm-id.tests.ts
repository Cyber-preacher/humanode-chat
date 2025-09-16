// apps/web/src/__tests__/dm-id.tests.ts

function localCanonId(a: string, b: string) {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  return `dm:${A < B ? A : B}:${A < B ? B : A}`;
}

describe('canonical DM id', () => {
  const a = '0x0000000000000000000000000000000000000001';
  const b = '0x00000000000000000000000000000000000000A2';

  it('is order-independent and case-insensitive', () => {
    const id1 = localCanonId(a, b);
    const id2 = localCanonId(b, a);
    const id3 = localCanonId(a.toUpperCase(), b.toLowerCase());
    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
    expect(id1.startsWith('dm:')).toBe(true);
  });
});
