import 'reflect-metadata';
import { Container } from './container.js';
import { Injectable } from './decorators/injectable.js';
import { Inject } from './decorators/inject.js';
import { CONFIG_TOKEN } from './tokens.js';

interface AppConfig {
  dbUrl: string;
}

@Injectable()
class Logger {
  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  log(message: string): void {
    console.log(`[log] ${message} (db=${this.config.dbUrl})`);
  }
}

@Injectable()
class UserRepo {
  constructor(private readonly logger: Logger) {}

  find(id: string): { id: string } {
    this.logger.log(`find user ${id}`);

    return { id };
  }
}

@Injectable()
class UserService {
  constructor(private readonly repo: UserRepo) {}

  get(id: string): { id: string } {
    return this.repo.find(id);
  }
}

@Injectable({ scope: 'transient' })
class RequestId {
  readonly value = Math.random().toString(16).slice(2, 8);
}

const container = new Container();
container.register(CONFIG_TOKEN, { dbUrl: 'postgres://localhost/demo' } satisfies AppConfig);

const service = container.resolve(UserService);

console.log('resolve(UserService) →', service.get('42'));
console.log('singleton — той самий екземпляр:', container.resolve(UserService) === service);
console.log(
  'transient — різні екземпляри:',
  container.resolve(RequestId).value,
  container.resolve(RequestId).value,
);

@Injectable()
class Left {
  constructor(public right?: unknown) {}
}

@Injectable()
class Right {
  constructor(public left: Left) {}
}

Reflect.defineMetadata('design:paramtypes', [Right], Left);

try {
  container.resolve(Left);
} catch (error) {
  console.log('цикл:', (error as Error).message);
}
