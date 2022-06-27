export type IMarshallableDictionary<Value> = {
    forEach(callback: (entry: Value, key: string) => void): void
    isEmpty: () => boolean
}

export type IMarshallableList<Value> = {
    forEach(callback: (element: Value) => void): void
    isEmpty: () => boolean
}
export type IMarshallableValue = {
    toDictionary(callback: ($: {
        entries: IMarshallableDictionary<IMarshallableValue>
    }) => void): void
    toGroup(callback: ($: {
        onProperty(key: string, callback: ($: IMarshallableValue) => void): void
    }) => void): void
    toList(callback: ($: {
        elements: IMarshallableList<IMarshallableValue>
    }) => void): void
    toTaggedUnion(callback: ($: {
        option: string
        value: IMarshallableValue
    }) => void): void
    toSimpleString(callback: ($: string) => void): void
    toMultilineString(callback: ($: string[]) => void): void
}
export type IMarshallableDataset = {
    root: IMarshallableValue
}