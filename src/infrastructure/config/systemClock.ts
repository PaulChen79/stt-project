import { Clock } from '../../domain/interfaces/ports/Clock';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
