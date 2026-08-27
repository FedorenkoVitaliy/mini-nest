import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Container } from '../src/container.js';
import { Injectable } from '../src/decorators/injectable.js';
import { Controller } from '../src/decorators/controller.js';
import { Get } from '../src/decorators/methods.js';
import { listen } from '../src/dispatcher.js';

const PHASES = [
  'middleware',
  'guard',
  'interceptor:before',
  'pipe',
  'handler',
  'interceptor:after',
] as const;

@Injectable()
@Controller('users')
class UsersController {
  @Get(':id')
  find() {
    return { ok: true };
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

test('порядок шарів: middleware → guard → interceptor → pipe → handler', async () => {
  const orig = console.log;
  const steps: string[] = [];
  console.log = (msg?: unknown, ...rest: unknown[]) => {
    if (typeof msg === 'string' && (PHASES as readonly string[]).includes(msg)) {
      steps.push(msg);
    }
    orig(msg, ...rest);
  };

  try {
    const res = await fetch(`${base}/users/42`, {
      headers: { authorization: 'Bearer x' },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(steps, [...PHASES]);
  } finally {
    console.log = orig;
  }
});
