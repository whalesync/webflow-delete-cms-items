export class ApiThrottler {
  private nextQuotaAvailableTimeMs = 0;

  constructor(private readonly millisecondsBetweenRequests: number) {}

  /**
   * Sleep until quota becomes available, and mark that new quota as used.
   * This is a really simple implementation, just make sure no request has happened in the last `secondsBetweenRequests`
   */
  async consumeQuota(ms?: number): Promise<void> {
    const nowTimeMs = Date.now();
    const msToWait =
      ms !== undefined ? ms : this.nextQuotaAvailableTimeMs - nowTimeMs;
    if (msToWait > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), msToWait)
      );
    }
    this.nextQuotaAvailableTimeMs =
      Date.now() + this.millisecondsBetweenRequests;
  }
}
