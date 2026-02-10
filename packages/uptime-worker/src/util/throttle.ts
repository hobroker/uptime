import pThrottle, { Options as PThrottleOptions } from "p-throttle";

export function throttle(options: PThrottleOptions) {
  const throttle = pThrottle(options);

  return function (originalMethod: any, context: ClassMethodDecoratorContext) {
    if (context.kind !== "method")
      throw new Error("Throttle only works on methods");

    const throttled = throttle((fn: Function, ...args: any[]) => fn(...args));

    return function (this: any, ...args: any[]) {
      return throttled(() => originalMethod.apply(this, args));
    };
  };
}
