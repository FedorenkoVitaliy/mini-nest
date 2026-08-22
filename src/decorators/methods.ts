import 'reflect-metadata';
import { ROUTE_METADATA } from '../tokens.js';

export function Get(path = ''): MethodDecorator {
    return (proto, key) => {
        Reflect.defineMetadata(ROUTE_METADATA, {method: 'GET', path}, proto, key)
    }
}

export function Post(path = ''): MethodDecorator {
    return (proto, key) => {
        Reflect.defineMetadata(ROUTE_METADATA, {method: 'POST', path}, proto, key)
    }
}