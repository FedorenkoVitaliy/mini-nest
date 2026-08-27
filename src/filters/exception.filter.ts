import { ValidationFailed } from '../pipes/zod-validation.pipe.js';
import { NotFoundError } from '../errors/not-found.error.js';

export class HttpFilter {
    catch(error: any, res: any){
        if(error instanceof SyntaxError){
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'invalid json' }));
            return;
          } else if(error instanceof ValidationFailed) {
            res.statusCode = 400;
            res.end(JSON.stringify(error.errors));
            return;
          } else if(error instanceof NotFoundError) {
            res.statusCode = 404;
            res.end(JSON.stringify({error: error.message}));
            return;
          }  else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'internal' }));
            return;
          }
    }
}