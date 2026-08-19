import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Injectable } from '../src/decorators/injectable.js';
import { Inject } from '../src/decorators/inject.js';
import { Container } from '../src/container.js';
import { CONFIG_TOKEN } from '../src/tokens.js';

interface AppConfig {
  dbUrl: string;
}

@Injectable()
class Repo {
  constructor(@Inject(CONFIG_TOKEN) public config: AppConfig) {}
}

test('залежність резолвиться за токеном, а не за типом', () => {
  const container = new Container();
  container.register(CONFIG_TOKEN, { dbUrl: 'postgres://localhost/demo' });

  assert.equal(container.resolve(Repo).config.dbUrl, 'postgres://localhost/demo');
});

test('інтерфейс у метаданих стирається до Object — тому й потрібен токен', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', Repo), [Object]);
});

test('токен без зареєстрованого значення дає зрозумілу помилку', () => {
  assert.throws(() => new Container().resolve(Repo), /CONFIG/);
});
