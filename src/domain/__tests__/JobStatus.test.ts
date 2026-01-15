import { describe, expect, it } from 'vitest';

import { isJobStatus, jobStatusValues } from '../value-objects/JobStatus';

describe('JobStatus', () => {
  it('accepts known statuses', () => {
    for (const status of jobStatusValues) {
      expect(isJobStatus(status)).toBe(true);
    }
  });

  it('rejects unknown values', () => {
    expect(isJobStatus('unknown')).toBe(false);
  });
});
