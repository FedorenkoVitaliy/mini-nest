import { als } from '../context/request-context.js';
import { Inject } from '../decorators/inject.js';
import { Injectable } from '../decorators/injectable.js';
import { CONFIG_TOKEN } from '../tokens.js';

export interface AppConfig {
  dbUrl: string;
}

@Injectable()
export class Logger {
  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  log(message: string): void {
    console.log(`[log] ${message} (db=${this.config.dbUrl}) id=${als.getStore()?.requestId}`);
    
  }
}