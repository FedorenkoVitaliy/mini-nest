import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Injectable } from '../src/decorators/injectable.js';

class Config {}

@Injectable()
class Logger {
  constructor(
    public cfg: Config,
    public port: number,
  ) {}
}

class Plain {
  constructor(public cfg: Config) {}
}

test('декоратор змушує компілятор записати типи конструктора', () => {
  const types = Reflect.getMetadata('design:paramtypes', Logger);

  assert.deepEqual(types, [Config, Number]);
});

test('без декоратора метаданих немає навіть з emitDecoratorMetadata', () => {
  const types = Reflect.getMetadata('design:paramtypes', Plain);

  assert.equal(types, undefined);
});
