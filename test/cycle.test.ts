import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Injectable } from '../src/decorators/injectable.js';
import { Container } from '../src/container.js';

@Injectable()
class A {
  constructor(public b?: unknown) {}
}

@Injectable()
class B {
  constructor(public a: A) {}
}

// Компілятор не дасть описати цикл у типах: посилання на B усередині A впало б
// у TDZ ще до створення класу. Тому замикаємо граф руками — контейнер отримує
// точно ті самі метадані, які згенерував би tsc.
Reflect.defineMetadata('design:paramtypes', [B], A);

test('цикл A -> B -> A падає з назвами всіх класів ланцюга', () => {
  assert.throws(
    () => new Container().resolve(A),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!(error instanceof RangeError), 'це має бути наша помилка, не stack overflow');
      assert.match(error.message, /A -> B -> A/);
      return true;
    },
  );
});
