import 'reflect-metadata';
import { PARAM_METADATA } from '../tokens.js';

export type PARAM_TYPE = 'param' | 'query' | 'body';

const prepareDataCallback = (type: PARAM_TYPE, param?: string): ParameterDecorator =>  (proto, propertyKey = '', index) => {
    const map = Reflect.getMetadata(PARAM_METADATA, proto, propertyKey) ?? {};

    map[index] = { type, ...(param? {name: param} : {}) };
    Reflect.defineMetadata(PARAM_METADATA, map, proto, propertyKey);
}

export function Param(id = ''): ParameterDecorator {
    return prepareDataCallback('param', id);
}

export function Query(name = ''): ParameterDecorator {
    return prepareDataCallback('query', name);
}

export function Body(): ParameterDecorator {
    return prepareDataCallback('body');
}