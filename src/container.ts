import 'reflect-metadata';
import { INJECTABLE_METADATA, INJECT_METADATA } from './tokens.js';
import type { InjectionToken, InjectedTokens } from './decorators/inject.js';

export type Ctor<T = unknown> = new (...args: any[]) => T;

export class Container {
    private readonly singletons = new Map<Ctor, unknown>();
    private readonly providers = new Map<InjectionToken, unknown>();

    register(token: InjectionToken, value: unknown): void {
        this.providers.set(token, value);
    }

    resolve<T>(target: Ctor<T>, path: Set<Ctor> = new Set()): T {
        if (path.has(target)) {
            const chain = [...path, target].map((ctor) => ctor.name).join(' -> ');
            throw new Error(`Циклічна залежність: ${chain}`);
        }
        const metadata = Reflect.getMetadata(INJECTABLE_METADATA, target);
        if (!metadata) {
            throw new Error(`${target.name} не позначений @Injectable()`);
        }
        if (metadata.scope === 'singleton') {
            const singleton = this.singletons.get(target) as T;
            if (singleton !== undefined) {
                return singleton;
            }
        }
  
        const paramTypes = (Reflect.getMetadata('design:paramtypes', target) ?? []) as Ctor[];
        const injectedTokens = (Reflect.getMetadata(INJECT_METADATA, target) ?? {}) as InjectedTokens;
        const args = paramTypes.map((dependency, index) => {
            if(injectedTokens[index] === undefined){
                return this.resolve(dependency, new Set(path).add(target));
            }
            if(this.providers.has(injectedTokens[index]) === false){
                throw new Error(`${String(injectedTokens[index])} не зареєстрований в контейнері`);
            }
            return this.providers.get(injectedTokens[index]) as T;
        });
        const instance = new target(...args);

        if (metadata.scope === 'singleton') {
            this.singletons.set(target, instance);
        }
      
        return instance;
    }   
}