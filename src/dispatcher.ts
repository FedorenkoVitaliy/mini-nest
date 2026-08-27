import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Container, Ctor } from './container.js';
import { collectRoutes } from './router.js';

import { PARAM_METADATA } from './tokens.js';
import { ZodValidationPipe } from './pipes/zod-validation.pipe.js';
import { AuthGuard } from './guards/auth.guard.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { HttpFilter } from './filters/exception.filter.js';
import { als } from './context/request-context.js';
import { NotFoundError } from './errors/not-found.error.js';

function matchPath(pattern: string, pathname: string) {
  const fromRoute = pattern.split('/').filter(Boolean);
  const fromUrl = pathname.split('/').filter(Boolean);

  if (fromRoute.length !== fromUrl.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < fromRoute.length; i++) {
    if (fromRoute[i].startsWith(':')) {
      params[fromRoute[i].slice(1)] = fromUrl[i];
    } else if (fromRoute[i] !== fromUrl[i]) {
      return null;
    }
  }

  return params;
}

type Next = () => void | Promise<void>;
type Stage = (req: IncomingMessage, res: ServerResponse, next: Next) => void | Promise<void>;

const stages: Stage[] = [
  (_req, _res, next) => {
    console.log('middleware');
    return next();
  },
  (_req, _res, next) => {
    console.log('guard');
    if(!new AuthGuard().canActivate(_req)){
      _res.statusCode = 403;
      _res.end(JSON.stringify({ error: 'Can not activate' }));
      return;
    }   
    return next();
  },
];

async function runStages(list: Stage[], req: IncomingMessage, res: ServerResponse, last: Next): Promise<void> {
  let i = 0;
  const next = async (): Promise<void> => {
    const stage = list[i++];
    if (!stage) {
      await last();
      return;
    }
    await stage(req, res, next);
  };
  await next();
}

export function listen(container: Container, controllers: Ctor[], port: number): Promise<Server> {
  const routeList = controllers.reduce((acc, Controller) => {
    collectRoutes(Controller).forEach((route) => {
      acc.push({ ...route, Controller });
    });
    return acc;
  }, [] as { method: string; path: string; handler: string; Controller: Ctor }[]);

  const pipe = new ZodValidationPipe();

  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const header = req.headers['x-request-id'];
    const fromClient = Array.isArray(header) ? header[0] : header;
    const requestId = fromClient?.trim() ? fromClient : crypto.randomUUID();
    res.setHeader('x-request-id', requestId);

    await als.run({ requestId }, async () => { 
      try{
        const url = new URL(req.url ?? '/', 'http://x');
        const matchedRoute = routeList.find(
          (route) => route.method === req.method && matchPath(route.path, url.pathname) !== null,
        );
        if (!matchedRoute) { throw new NotFoundError(`Cannot ${req.method} ${url.pathname}`) }
        const params = matchPath(matchedRoute.path, url.pathname)!;
        const ctrl = container.resolve(matchedRoute.Controller) as Record<string, Function>;
        const meta = Reflect.getMetadata(PARAM_METADATA, matchedRoute.Controller.prototype, matchedRoute.handler) ?? {};
        let body: unknown;
        let args: unknown[] = [] 
    
        const paramTypes = (Reflect.getMetadata(
          'design:paramtypes',
          matchedRoute.Controller.prototype,
          matchedRoute.handler,
        ) ?? []) as Ctor[];

        const parseBody: Stage = async (_req, _res, next) => {
          if (req.method === 'POST') {
            body = await new Promise((resolve, reject) => {
              const chunks: Buffer[] = [];
              req.on('data', (chunk) => chunks.push(chunk));
              req.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                if(raw){
                  try{
                    resolve(JSON.parse(raw))
                    return
                  } catch (error) {
                    reject(error)
                    return
                  }
                }
    
                resolve(undefined);
              });
              req.on('error', reject);
            })
          }

          args = Object.keys(meta).reduce<unknown[]>((acc, key) => {
            const spec = meta[key];
            const i = Number(key);
            if (spec.type === 'param') acc[i] = params[spec.name];
            if (spec.type === 'query') acc[i] = url.searchParams.get(spec.name);
            if (spec.type === 'body') acc[i] = body;
            return acc;
          }, []);
         
          return next();
        };

        const invoke: Stage = async (_req, _res, next) => {
          const raw = await new LoggingInterceptor().intercept(async () => {
            console.log('pipe');
            for (let i = 0; i < args.length; i++) {
              args[i] = await pipe.transform(args[i], paramTypes[i]);
            }

            console.log('handler');
            return await ctrl[matchedRoute.handler](...args);
          }, { method: req.method, path: url.pathname });

          res.end(JSON.stringify(raw));
          return next();
        };

        await runStages([...stages, parseBody, invoke], req, res, async () => {});
  
  
      } catch (error) {
        new HttpFilter().catch(error, res)
      }
    })
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log('listen', port);
      resolve(server);
    });
    server.on('error', reject);
  });
}