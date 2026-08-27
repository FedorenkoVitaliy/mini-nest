import { Injectable } from '../decorators/injectable.js';
import { Logger } from './logger.js';

@Injectable()
export class UserRepo {
  constructor(private readonly logger: Logger) {}

  find(id: string): { id: string } {
    this.logger.log(`find user ${id}`);

    return { id };
  }
}