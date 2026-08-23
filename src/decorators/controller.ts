import 'reflect-metadata';
import { CONTROLLER_METADATA } from '../tokens.js';

export function Controller(prefix: string): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(CONTROLLER_METADATA, prefix, target)
    }
}