interface Array<T> {
    length: number
    push(v: T): void
}

interface ErrorConstructor {
    new(message?: string): Error
}

declare let Error: ErrorConstructor;
