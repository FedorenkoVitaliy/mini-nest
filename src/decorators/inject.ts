import 'reflect-metadata';
import { INJECT_METADATA } from '../tokens.js';

export type InjectionToken = symbol | string;

export type InjectedTokens = Record<number, InjectionToken>;

export function Inject(token: InjectionToken): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const tokens = (Reflect.getMetadata(INJECT_METADATA, target) ?? {}) as InjectedTokens;

    tokens[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA, tokens, target);
  };
}
