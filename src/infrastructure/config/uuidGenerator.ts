import { randomUUID } from 'crypto';

import { IdGenerator } from '../../domain/interfaces/ports/IdGenerator';

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
