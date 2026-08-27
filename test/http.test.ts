import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Container } from '../src/container.js';
import { Injectable } from '../src/decorators/injectable.js';
import { Controller } from '../src/decorators/controller.js';
import { Get, Post } from '../src/decorators/methods.js';
import { Body, Param, Query } from '../src/decorators/param.js';
import { CreateUserDto } from '../src/dto/create-user.dto.js';
import { listen } from '../src/dispatcher.js';
import { als } from '../src/context/request-context.js';
import { NotFoundError } from '../src/errors/not-found.error.js';

let findCalled = false;

@Injectable()
@Controller('users')
class UsersController {
  @Get(':id')
  async find(@Param('id') id: string, @Query('limit') limit: string) {
    await new Promise((resolve) => setTimeout(resolve, 15));
    findCalled = true;
    return { id, limit, requestId: als.getStore()?.requestId };
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return { name: dto.name, isDto: dto instanceof CreateUserDto };
  }
}

@Injectable()
@Controller('crash')
class CrashController {
  @Get()
  boom() {
    throw new Error('boom');
  }
}

@Injectable()
@Controller('items')
class ItemsController {
  @Get(':id')
  find(@Param('id') id: string) {
    throw new NotFoundError(`item ${id} not found`);
  }
}

let server: Server;
let base: string;

before(async () => {
  server = await listen(new Container(), [UsersController, CrashController, ItemsController], 0);
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const auth = { authorization: 'Bearer x' };

test('невідомий шлях дає 404 з повідомленням і X-Request-Id', async () => {
  const res = await fetch(`${base}/nope`, { headers: { 'x-request-id': 'missing-route' } });
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.match(String(body.error), /Cannot GET \/nope/);
  assert.equal(res.headers.get('x-request-id'), 'missing-route');
});

test('GET /users/:id склеює префікс і шлях', async () => {
  const res = await fetch(`${base}/users/42`, { headers: auth });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, '42');
});

test('@Param підставляє id аргументом, не з req вручну', async () => {
  const body = await (await fetch(`${base}/users/7`, { headers: auth })).json();
  assert.equal(body.id, '7');
});

test('@Query підставляє limit', async () => {
  const body = await (await fetch(`${base}/users/42?limit=5`, { headers: auth })).json();
  assert.equal(body.limit, '5');
});

test('невалідний body дає 400 зі списком field/constraints', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A' }),
  });
  const errors = await res.json();

  assert.equal(res.status, 400);
  assert.ok(Array.isArray(errors));
  assert.ok(errors.some((error: { field: string }) => error.field === 'name'));
  assert.ok(errors[0].constraints);
});

test('валідний body доходить до методу (Zod віддає plain-обʼєкт)', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Ada', email: 'ada@example.com' }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.name, 'Ada');
  assert.equal(body.isDto, false);
});

test('без Authorization — 403, хендлер не викликається', async () => {
  findCalled = false;
  const res = await fetch(`${base}/users/42`);
  assert.equal(res.status, 403);
  assert.equal(findCalled, false);
});

test('interceptor пише рядок з ms', async () => {
  const orig = console.log;
  const lines: string[] = [];
  console.log = (msg?: unknown, ...rest: unknown[]) => {
    lines.push([msg, ...rest].map(String).join(' '));
    orig(msg, ...rest);
  };

  try {
    await fetch(`${base}/users/42`, { headers: auth });
    assert.ok(lines.some((line) => /\d+ ms/.test(line)));
  } finally {
    console.log = orig;
  }
});

test('помилка хендлера → 500 без boom і без стеку', async () => {
  const res = await fetch(`${base}/crash`, { headers: auth });
  const text = await res.text();
  assert.equal(res.status, 500);
  assert.equal(/boom|at .+\.ts:/.test(text), false);
});

test('NotFoundError з хендлера → 404 з повідомленням', async () => {
  const res = await fetch(`${base}/items/7`, { headers: auth });
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error, 'item 7 not found');
});

test('X-Request-Id з запиту повертається у відповіді і в тілі зі store', async () => {
  const res = await fetch(`${base}/users/42`, {
    headers: { ...auth, 'x-request-id': 'abc' },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-request-id'), 'abc');
  assert.equal(body.requestId, 'abc');
});

test('паралельні запити не змішують requestId зі store', async () => {
  const ids = Array.from({ length: 10 }, (_, i) => `id-${i}`);
  const bodies = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`${base}/users/42`, {
        headers: { ...auth, 'x-request-id': id },
      });
      const body = await res.json();
      return { header: res.headers.get('x-request-id'), requestId: body.requestId };
    }),
  );
  assert.deepEqual(
    bodies.map((row) => row.header),
    ids,
  );
  assert.deepEqual(
    bodies.map((row) => row.requestId),
    ids,
  );
});
