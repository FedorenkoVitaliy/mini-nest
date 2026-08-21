import 'reflect-metadata';
import { INJECTABLE_METADATA } from '../tokens.js';
export type Scope = 'singleton' | 'transient';
export interface InjectableOptions {
  scope?: Scope;
}
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(
      INJECTABLE_METADATA,
      { scope: options.scope ?? 'singleton' },
      target,
    );
  };
}