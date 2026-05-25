export async function computeSha256(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
