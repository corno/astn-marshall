
import * as pr from "pareto-runtime"
import { IMarshallableDataset, IMarshallableValue } from "../interface"
import { Datastore, Value } from "../interface/types/Datastore"


export function createMarshallInterface(
    ds: Datastore
): IMarshallableDataset {
    function createValueSerializeInterface(value: Value): IMarshallableValue {
        return {
            toDictionary: (callback) => {
                if (value.type === null || value.type[0] !== "dictionary") {
                    throw new Error("Unexpected: missing or invalid dictionary")
                }
                const dict = value.type[1]
                callback({
                    entries: {
                        forEach: (callback2) => {
                            pr.Objectkeys(dict).forEach((key) => {
                                callback2(createValueSerializeInterface(dict[key]), key)
                            })
                        },
                        isEmpty: () => pr.Objectkeys(dict).length === 0,
                    },
                })
            },
            toGroup: (callback) => {
                if (value.type === null || value.type[0] !== "group") {
                    throw new Error("Unexpected: missing or invalid group")
                }
                const group = value.type[1]
                callback({
                    onProperty: (key, callback2) => {
                        const property = group[key]
                        if (property !== undefined) {
                            callback2(createValueSerializeInterface(property))
                        }

                    },
                })
            },
            toList: (callback) => {
                if (value.type === null || value.type[0] !== "list") {
                    throw new Error("Unexpected: missing or invalid list")
                }
                const list = value.type[1]
                callback({
                    elements: {
                        forEach: (callback2) => {
                            list.forEach((e) => {
                                callback2(createValueSerializeInterface(e))
                            })
                        },
                        isEmpty: () => list.length === 0,

                    },
                })
            },
            toMultilineString: (callback) => {
                if (value.type === null || value.type[0] !== "multiline string") {
                    throw new Error("Unexpected: missing or invalid multiline string")
                }
                callback(value.type[1])
            },
            toSimpleString: (callback) => {
                if (value.type === null || value.type[0] !== "simple string") {
                    throw new Error("Unexpected: missing or invalid simple string")
                }
                callback(value.type[1])
            },
            toTaggedUnion: (callback) => {
                if (value.type === null || value.type[0] !== "tagged union") {
                    throw new Error("Unexpected: missing or invalid tagged union")
                }
                const tu = value.type[1]
                if (tu.option !== null) {
                    callback({
                        option: tu.option,
                        value: createValueSerializeInterface(tu.value),
                    })

                }
            },
        }
    }

    return {
        root: createValueSerializeInterface(ds.root),
    }
}