export class LoggingInterceptor {
    async intercept(next: any, params: {method?: string, path: string}){
        const started = Date.now();
        console.log('interceptor:before');
   
        const raw = await next();
        const tookMs = Date.now() - started;
        console.log('interceptor:after');
        console.log(`${params.method} ${params.path} — ${tookMs} ms`);
  
        return raw;
    }
}