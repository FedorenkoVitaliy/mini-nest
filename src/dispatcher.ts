import { createServer, type Server } from 'node:http';
import type { Container, Ctor } from './container.js';
import { collectRoutes } from './router.js';

import { PARAM_METADATA } from './tokens.js';
import { ValidationFailed, ValidationPipe } from './pipes/validation.pipe.js';

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

export function listen(container: Container, controllers: Ctor[], port: number): Promise<Server> {
  const routeList = controllers.reduce((acc, Controller) => {
    collectRoutes(Controller).forEach((route) => {
      acc.push({ ...route, Controller });
    });
    return acc;
  }, [] as { method: string; path: string; handler: string; Controller: Ctor }[]);

  const pipe = new ValidationPipe();

  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const url = new URL(req.url ?? '/', 'http://x');
    const matchedRoute = routeList.find(
      (route) => route.method === req.method && matchPath(route.path, url.pathname) !== null,
    );

    if (!matchedRoute) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }

    const params = matchPath(matchedRoute.path, url.pathname)!;
    const ctrl = container.resolve(matchedRoute.Controller) as Record<string, Function>;
    const meta = Reflect.getMetadata(PARAM_METADATA, matchedRoute.Controller.prototype, matchedRoute.handler) ?? {};
    let body: unknown;
    if (req.method === 'POST') {
      body = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          resolve(raw ? JSON.parse(raw) : undefined);
        });
        req.on('error', reject);
      });
    }
    const args = Object.keys(meta).reduce<unknown[]>((acc, key) => {
      const spec = meta[key];
      const i = Number(key);
      if (spec.type === 'param') acc[i] = params[spec.name];
      if (spec.type === 'query') acc[i] = url.searchParams.get(spec.name);
      if (spec.type === 'body') acc[i] = body;
      return acc;
    }, []);

    const paramTypes = (Reflect.getMetadata(
      'design:paramtypes',
      matchedRoute.Controller.prototype,
      matchedRoute.handler,
    ) ?? []) as Ctor[];

    try {
      for (let i = 0; i < args.length; i++) {
        args[i] = await pipe.transform(args[i], paramTypes[i]);
      }
    } catch (error) {
      if (error instanceof ValidationFailed) {
        res.statusCode = 400;
        res.end(JSON.stringify(error.errors));
        return;
      }
      throw error;
    }

    res.end(JSON.stringify(ctrl[matchedRoute.handler](...args)));
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log('listen', port);
      resolve(server);
    });
    server.on('error', reject);
  });
}