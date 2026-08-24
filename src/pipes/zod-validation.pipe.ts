import type { Ctor } from '../container.js';
import { createUserSchema } from '../dto/create-user.schema.js';

export type FieldError = {
  field: string;
  constraints: Record<string, string>;
};


export class ValidationFailed {
  constructor(public readonly errors: FieldError[]) {}
}

const NATIVE = new Set<unknown>([String, Number, Boolean, Array, Object]);

export class ZodValidationPipe {
  async transform(value: unknown, metatype?: Ctor): Promise<unknown> {
    if (!metatype || NATIVE.has(metatype)) {
      return value;
    }

    const result = createUserSchema.safeParse(value);
    if (!result.success) {
      throw new ValidationFailed(
        result.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? ''),
          constraints: { [issue.code]: issue.message },
        })),
      );
    }
    return result.data;
  }
}
