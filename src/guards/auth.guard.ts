export class AuthGuard {
    canActivate(req: any): boolean{
        return !!req.headers.authorization;
    }
}