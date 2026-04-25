class RequestQueue {
  constructor(maxConcurrent = 1, delayMs = 2000) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.queue = [];
    this.running = 0;
    this.lastRequestTime = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      // Enforce rate limiting between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.delayMs) {
        await new Promise((r) =>
          setTimeout(r, this.delayMs - timeSinceLastRequest)
        );
      }

      this.lastRequestTime = Date.now();
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.process();
    }
  }
}

module.exports = RequestQueue;
