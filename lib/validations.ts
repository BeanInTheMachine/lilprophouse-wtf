import { NextResponse } from 'next/server';

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message: string = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data, { status: 200 });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function validateRequired(fields: Record<string, unknown>, required: string[]): string | null {
  for (const field of required) {
    const value = fields[field];
    if (value === undefined || value === null || value === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
