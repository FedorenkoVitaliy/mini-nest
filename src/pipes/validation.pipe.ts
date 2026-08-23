import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Ctor } from '../container.js';

export type FieldError = {
  field: string;
  constraints: Record<string, string>;
};

export class ValidationFailed {
  constructor(public readonly errors: FieldError[]) {}
}

const NATIVE = new Set<unknown>([String, Number, Boolean, Array, Object]);

export class ValidationPipe {
  async transform(value: unknown, metatype?: Ctor): Promise<unknown> {
    if (!metatype || NATIVE.has(metatype)) {
      return value;
    }

    const instance = plainToInstance(metatype, value);
    const errors = await validate(instance as object, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new ValidationFailed(
        errors.map((error) => ({
          field: error.property,
          constraints: error.constraints ?? {},
        })),
      );
    }

    return instance;
  }
}
