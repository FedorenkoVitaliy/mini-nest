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

@Injectable()
@Controller('users')
class UsersController {
  @Get(':id')
  find(@Param('id') id: string, @Query('limit') limit: string) {
    return { id, limit };
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return { name: dto.name, isDto: dto instanceof CreateUserDto };
  }
}

let server: Server;
let base: string;

before(async () => {
  server = await listen(new Container(), [UsersController], 0);
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('невідомий шлях дає 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});

test('GET /users/:id склеює префікс і шлях', async () => {
  const res = await fetch(`${base}/users/42`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, '42');
});

test('@Param підставляє id аргументом, не з req вручну', async () => {
  const body = await (await fetch(`${base}/users/7`)).json();
  assert.equal(body.id, '7');
});

test('@Query підставляє limit', async () => {
  const body = await (await fetch(`${base}/users/42?limit=5`)).json();
  assert.equal(body.limit, '5');
});

test('невалідний DTO дає 400 зі списком field/constraints', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A' }),
  });
  const errors = await res.json();

  assert.equal(res.status, 400);
  assert.equal(errors[0].field, 'name');
  assert.ok(errors[0].constraints.minLength);
});

test('валідний DTO доходить до методу як екземпляр класу', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Ada' }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.name, 'Ada');
  assert.equal(body.isDto, true);
});
