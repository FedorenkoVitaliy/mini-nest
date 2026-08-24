import { ValidationFailed } from '../pipes/zod-validation.pipe.js';

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
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'internal' }));
            return;
          }
    }
}