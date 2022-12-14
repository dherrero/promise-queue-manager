import { Dictionary, Worker, Patient, PromiseType, StoreType } from './queue-manager.types';
export class PromisesQueueManager<T> {
  private resultStoreMap: Dictionary<T> = {};
  private queueMap: Dictionary<Worker<T>> = {};
  private store: StoreType;

  /**
   *
   * @param {StoreType} store configures the queue data storage
   */
  constructor(store?: StoreType) {
    this.store = store;
  }

  /**
   *
   * @param {string} queueName the queue name must be unique per data
   * @param {PromiseType<T>} promiseCall the promise to obtain the data
   * @returns {PromiseType<T>} the promise that returns data
   */
  public callPromise(queueName: string, promiseCall?: PromiseType<T>): Promise<T> {
    this._checkStorage(queueName);
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
          waitingRoom: []
        };
        this.queueMap[queueName] = worker;
        this._dequeue(queueName);
      } else {
        const patient: Patient<T> = { resolve, reject };
        this.queueMap[queueName].waitingRoom.push(patient);
      }
    });
  }

  /**
   *
   * @param {string} queueName  the queue name
   * @returns {T} the stored data
   */
  public getStorageSync(queueName: string): T {
    this._checkStorage(queueName);
    return this.resultStoreMap[queueName];
  }

  private _dequeue(queueName: string) {
    const worker: Worker<T> = this.queueMap[queueName];
    worker.promise
      .then((result: T) => {
        this.queueMap[queueName].working = false;
        this._setStorage(queueName, result);
        this.queueMap[queueName].waitingRoom.forEach((patient: Patient<T>) => patient.resolve(result));
        worker.resolve(result);
      })
      .catch((e: Error) => {
        this.queueMap[queueName].working = false;
        this.queueMap[queueName].waitingRoom.forEach((patient: Patient<T>) => patient.reject(e));
        worker.reject(e);
      });
  }

  private _checkStorage(queueName: string) {
    if (this.resultStoreMap[queueName]) return;
    if (this.store) {
      const check = window[this.store].getItem(queueName);
      if (check) {
        this.resultStoreMap[queueName] = JSON.parse(check);
      }
    }
  }

  private _setStorage(queueName: string, result: T) {
    this.resultStoreMap[queueName] = result;
    if (this.store) {
      window[this.store].setItem(queueName, JSON.stringify(result));
    }
  }
}
