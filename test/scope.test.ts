import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Injectable } from '../src/decorators/injectable.js';
import { Container } from '../src/container.js';

@Injectable()
class Shared {}

@Injectable({ scope: 'transient' })
class Fresh {}

@Injectable()
class NeedsFresh {
  constructor(public fresh: Fresh) {}
}

test('без явного скоупу — singleton', () => {
  const container = new Container();

  assert.equal(container.resolve(Shared), container.resolve(Shared));
});

test('scope transient — новий екземпляр на кожен resolve', () => {
  const container = new Container();

  assert.notEqual(container.resolve(Fresh), container.resolve(Fresh));
});

test('transient-залежність не кешується всередині графа', () => {
  const container = new Container();

  assert.notEqual(container.resolve(NeedsFresh).fresh, container.resolve(Fresh));
});
