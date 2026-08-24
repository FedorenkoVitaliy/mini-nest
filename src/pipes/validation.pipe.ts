import { plainToInstance } from 'class-transformer';

import type { Ctor } from '../container.js';

export type FieldError = {
  field: string;
  constraints: Record<string, string>;
};


export class ValidationPipe {
  async transform(value: unknown, metatype?: Ctor): Promise<unknown> {
    if (!metatype) {
      return value;
    }

    const instance = plainToInstance(metatype, value);

    return instance;
  }
}
