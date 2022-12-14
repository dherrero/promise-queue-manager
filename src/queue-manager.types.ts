export interface PromiseType<T> {
  fn: (...args: unknown[]) => Promise<T>;
  args?: unknown[];
}

export interface Dictionary<T> {
  [key: string]: T;
}

export interface Patient<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (e: Error) => void;
}

export interface Worker<T> extends Patient<T> {
  working: boolean;
  waitingRoom: Patient<T>[];
  promise: Promise<T>;
}

export type StoreType = 'localStorage' | 'sessionStorage' | undefined;
