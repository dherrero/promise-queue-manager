export interface PromiseType<T> {
  fn: (...args: unknown[]) => Promise<T>;
  args?: unknown[];
}

export interface Dictionary<T> {
  [key: string]: T;
}

interface Patient<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (e: Error) => void;
}

interface Worker<T> extends Patient<T> {
  working: boolean;
  waitingRoom: Patient<T>[];
  promise: Promise<T>;
}

type StoreType = 'localStorage' | 'sessionStorage' | undefined;

export default class PromisesQueueManager<T> {
  private resultStoreMap: Dictionary<T> = {};
  private queueMap: Dictionary<Worker<T>> = {};
  private store: StoreType;

  constructor(store?: StoreType) {
    this.store = store;
  }

  public callPromise(queueName: string, promiseCall?: PromiseType<T>): Promise<T> {
    this.checkStorage(queueName);
    return new Promise<T>((resolve, reject) => {
      if (this.resultStoreMap[queueName]) {
        resolve(this.resultStoreMap[queueName]);
      } else if (!promiseCall) {
        reject(new Error('Without Promise there is nothing to do'));
      } else if (!this.queueMap[queueName] || !this.queueMap[queueName].working) {
        const { fn, args = [] } = promiseCall;
        const worker: Worker<T> = {
          working: true,
          promise: fn(...args),
          resolve,
          reject,
          waitingRoom: [],
        };
        this.queueMap[queueName] = worker;
        this.dequeue(queueName);
      } else {
        const patient: Patient<T> = { resolve, reject };
        this.queueMap[queueName].waitingRoom.push(patient);
      }
    });
  }

  public getStorageSync(queueName: string): T {
    this.checkStorage(queueName);
    return this.resultStoreMap[queueName];
  }

  private dequeue(queueName: string) {
    const worker: Worker<T> = this.queueMap[queueName];
    worker.promise
      .then((result: T) => {
        this.queueMap[queueName].working = false;
        this.setStorage(queueName, result);
        this.queueMap[queueName].waitingRoom.forEach((patient: Patient<T>) => patient.resolve(result));
        worker.resolve(result);
      })
      .catch((e: Error) => {
        this.queueMap[queueName].working = false;
        this.queueMap[queueName].waitingRoom.forEach((patient: Patient<T>) => patient.reject(e));
        worker.reject(e);
      });
  }

  private checkStorage(queueName: string) {
    if (this.resultStoreMap[queueName]) return;
    if (this.store) {
      const check = window[this.store].getItem(queueName);
      if (check) {
        this.resultStoreMap[queueName] = JSON.parse(check);
      }
    }
  }

  private setStorage(queueName: string, result: T) {
    this.resultStoreMap[queueName] = result;
    if (this.store) {
      window[this.store].setItem(queueName, JSON.stringify(result));
    }
  }
}
