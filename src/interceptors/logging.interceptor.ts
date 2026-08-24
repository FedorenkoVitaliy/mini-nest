export class LoggingInterceptor {
    async intercept(next: any){
        console.log('interceptor:before');
        const raw = await next();
        console.log('interceptor:after');
        return raw;
    }
}