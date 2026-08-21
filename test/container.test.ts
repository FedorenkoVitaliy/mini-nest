import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Injectable } from '../src/decorators/injectable.js';
import { Container } from '../src/container.js';

@Injectable()
class C {
  readonly name = 'C';
}

@Injectable()
class B {
  constructor(public c: C) {}
}

@Injectable()
class A {
  constructor(public b: B) {}
}

class NotInjectable {}

test('граф збирається рекурсивно: A -> B -> C', () => {
  const instance = new Container().resolve(A);

  assert.ok(instance instanceof A);
  assert.ok(instance.b instanceof B);
  assert.ok(instance.b.c instanceof C);
  assert.equal(instance.b.c.name, 'C');
});

test('singleton: той самий екземпляр на кожен resolve', () => {
  const container = new Container();

  assert.equal(container.resolve(A), container.resolve(A));
});

test('спільна залежність створюється один раз', () => {
  const container = new Container();

  assert.equal(container.resolve(A).b.c, container.resolve(C));
});

test('клас без @Injectable() контейнер не створює', () => {
  assert.throws(() => new Container().resolve(NotInjectable), /NotInjectable/);
});
