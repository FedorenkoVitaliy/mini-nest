# mini-nest

Свій IoC-контейнер і HTTP-шар поверх `node:http`. Частина 3 з 3: цикл запиту.

TypeScript 6, `reflect-metadata`, Zod 4, `AsyncLocalStorage`, тести на `node:test`. Nest / Express / Fastify немає.

## Запуск

```bash
npm install
npm test    # tsc + node --test
npm start   # демо IoC + слухає :3000
```

У Docker (образ із ДЗ #5):

```bash
docker compose run --rm api npm test
```

## Структура

| Файл | Що робить |
|------|-----------|
| `src/decorators/injectable.ts` | `@Injectable({ scope })` — позначає клас як придатний до створення |
| `src/decorators/inject.ts` | `@Inject(token)` — явний токен для параметра конструктора |
| `src/container.ts` | `resolve()`: рекурсія, кеш синглтонів, детекція циклу |
| `src/tokens.ts` | символи: ключі метаданих і токен `CONFIG` |
| `src/decorators/controller.ts` | `@Controller(prefix)` — базовий шлях |
| `src/decorators/methods.ts` | `@Get` / `@Post` — метод і шлях на хендлері |
| `src/decorators/param.ts` | `@Body` / `@Param` / `@Query` — звідки брати аргумент |
| `src/router.ts` | збір маршрутів з метаданих |
| `src/dispatcher.ts` | `node:http`: матч, ALS, guard, interceptor, пайп, filter |
| `src/guards/auth.guard.ts` | `canActivate` — є `Authorization` чи ні |
| `src/interceptors/logging.interceptor.ts` | обгортка: лог до/після + `ms` |
| `src/pipes/zod-validation.pipe.ts` | `safeParse` → дані або `ValidationFailed` |
| `src/filters/http-exception.filter.ts` | помилка → 400 / 500 |
| `src/context/request-context.ts` | `AsyncLocalStorage` з `requestId` |
| `src/dto/create-user.schema.ts` | Zod-схема POST body |
| `src/main.ts` | демо-граф і `listen(..., 3000)` |
| `test/` | тести |

## Можливості
- збирає граф будь-якої глибини за типами конструктора — списку `deps` немає ніде;
- `singleton` за замовчуванням, `@Injectable({ scope: 'transient' })` — новий екземпляр на кожен `resolve`;
- `@Inject(token)` для того, чого в рантаймі немає: інтерфейсів, конфігів, рядків;
- цикл падає з ланцюгом `Left -> Right -> Left`, а не зі `RangeError`;
- клас без `@Injectable()` не створює й каже про це прямо.
- `@Controller` + `@Get`/`@Post` збираються в маршрути з метаданих; `@Param`/`@Query`/`@Body` — у аргументи хендлера;
- невалідний DTO → 400 `[{ field, constraints }]`, валідний — екземпляр класу.

## Як це працює

Типи в TypeScript стираються: з `constructor(logger: Logger, port: number)` у JS лишається
`constructor(logger, port)`. Тому контейнер не може «побачити» типи сам — їх мусить записати
компілятор ще під час збірки.

Це і робить `emitDecoratorMetadata`: якщо на класі є хоч один декоратор, `tsc` додає до
згенерованого коду метадані `design:paramtypes` — масив конструкторів параметрів, `[Logger, Number]`.
Зберігає їх поліфіл `reflect-metadata`, тому його імпорт стоїть першим рядком точки входу й кожного
тесту. Контейнер потім просто читає цей масив через `Reflect.getMetadata('design:paramtypes', Target)`
і рекурсивно резолвить кожен елемент. Уся магія DI — цей один виклик.

Без `emitDecoratorMetadata` метаданих не буде взагалі: код скомпілюється, а на резолві прийде
`undefined` замість масиву типів. `experimentalDecorators` потрібен окремо — він дозволяє сам
синтаксис legacy-декораторів, зокрема декоратори параметрів для `@Inject()`. І навіть з обома
прапорцями клас без жодного `@` метаданих не отримає: тому `@Injectable()` — це не лише дозвіл для
контейнера, а й тригер для компілятора. Так само важливий інструмент: `tsc`, `ts-node` і SWC емітять
`design:*`, esbuild — ні.

У метаданих на місці інтерфейсу стоїть `Object`, бо в рантаймі його не
існує; звідси й потреба в `@Inject(Symbol.for('CONFIG'))`. Клас же сам собі токен, бо існує як
функція. Параметр-декоратор при цьому лише запамʼятовує «для параметра №0 потрібен цей токен» —
значення підставляє контейнер під час `new`.

`@Param('id')` / `@Query` / `@Body` пишуть ту саму ідею, але на метод: `(prototype, ім'яМетоду, index)` → мапа `{ [index]: { type, name } }`. Диспетчер читає мапу і збирає `args` для виклику. Декоратор сам значення з URL не дістає.
