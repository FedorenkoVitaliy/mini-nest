import { Injectable } from '../decorators/injectable.js';
import { UserRepo } from './user-repo.js';

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepo) {}

  get(id: string): { id: string } {
    return this.repo.find(id);
  }
}
