import 'reflect-metadata';
import { collectRoutes } from './router.js';
import { listen } from './dispatcher.js';
import { Container } from './container.js';
import { Injectable } from './decorators/injectable.js';

import { Controller } from './decorators/controller.js';
import { Get, Post } from './decorators/methods.js';
import { Param, Query, Body } from './decorators/param.js';
import { CreateUserDto } from './dto/create-user.dto.js';

import { AppConfig } from './services/logger.js';
import { UserService } from './services/user-service.js';

import { CONFIG_TOKEN } from './tokens.js';


@Injectable({ scope: 'transient' })
class RequestId {
  readonly value = Math.random().toString(16).slice(2, 8);
}

@Injectable()
@Controller('users')
class UsersController {
  constructor(private readonly users: UserService) {}
  @Get(':id')
  find(@Param('id') id: string, @Query('limit') limit: string) {
    return this.users.get(id);
  }
  @Post()
  create(@Body() dto: CreateUserDto) {
    return { name: dto.name, isDto: dto instanceof CreateUserDto };
  }
}

console.log('out', collectRoutes(UsersController));

const container = new Container();
container.register(CONFIG_TOKEN, { dbUrl: 'postgres://localhost/demo' } satisfies AppConfig);
console.log(container.resolve(UsersController).find('42', '3'));

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

listen(container, [UsersController], 3000);
