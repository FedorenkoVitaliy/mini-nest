import type { Ctor } from '../container.js';
import { createUserSchema } from '../dto/create-user.schema.js';
import { CreateUserDto } from '../dto/create-user.dto.js';

export type FieldError = {
  field: string;
  constraints: Record<string, string>;
};


export class ValidationFailed {
  constructor(public readonly errors: FieldError[]) {}
}

const NATIVE = new Set<unknown>([String, Number, Boolean, Array, Object]);

const schemas = new Map();
schemas.set(CreateUserDto, createUserSchema);

export class ZodValidationPipe {
  async transform(value: unknown, metatype?: Ctor): Promise<unknown> {
    if (!metatype || NATIVE.has(metatype)) {
      return value;
    }

    const schema = schemas.get(metatype);
    if (!schema) return value;
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new ValidationFailed(
        result.error.issues.map((issue: { path: any[]; code: any; message: any; }) => ({
          field: String(issue.path[0] ?? ''),
          constraints: { [issue.code]: issue.message },
        })),
      );
    }
    return result.data;
  }
}
