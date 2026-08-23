import { CONTROLLER_METADATA, ROUTE_METADATA } from './tokens.js';
import type { Ctor } from './container.js';

export type HttpMethod = 'GET' | 'POST';

export interface Route {
  method: HttpMethod;
  path: string;
  handler: string;
}

interface RouteMeta {
  method: HttpMethod;
  path: string;
}

export function collectRoutes(ControllerClass: Ctor): Route[] {
  const prefix = Reflect.getMetadata(CONTROLLER_METADATA, ControllerClass);
  const keys = Object.getOwnPropertyNames(ControllerClass.prototype);

  return keys.reduce<Route[]>((acc, key) => {
    if (key === 'constructor') {
      return acc;
    }

    const meta = Reflect.getMetadata(ROUTE_METADATA, ControllerClass.prototype, key);

    if (!meta) {
      return acc;
    }

    acc.push({
      method: meta.method,
      path: `/${prefix}/${meta.path}`,
      handler: key,
    });
    return acc;
  }, []);
}
