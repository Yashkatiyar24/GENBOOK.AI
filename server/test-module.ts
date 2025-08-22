// Simple test module to verify TypeScript module resolution
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

console.log('Test module loaded:', import.meta.url);
