export function initPolyfills() {
  if (typeof window === 'undefined') return;

  try {
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (
      property: string,
      value: string | number | null,
      priority?: string,
    ) {
      if (property === 'border' && value === 0) {
        return originalSetProperty.call(this, property, 'none', priority);
      }
      if (property === 'border' && typeof value === 'number') {
        return originalSetProperty.call(this, property, `${value}px`, priority);
      }
      return originalSetProperty.call(this, property, value as string, priority);
    };
  } catch (e) {
    // silently fail if monkey-patching isn't possible
  }
}
