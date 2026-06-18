const raw = process.env.ADMIN_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || '';
const ADMIN_ADDRESSES: string[] = raw
  .split(',')
  .map((a) => a.trim().toLowerCase())
  .filter((a) => a.startsWith('0x') && a.length === 42);

export function isAdmin(address?: string): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
}

export { ADMIN_ADDRESSES };
