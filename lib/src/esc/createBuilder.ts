
import { ITypedTreeHandler, ITypedValueHandler } from "astn-typedtreehandler-api"
import { Datastore, Dictionary, DSTaggedUnion, Group, Value } from "astn-marshall-api"

export function createBuilder<EventAnnotation>(
    ds: Datastore,
    onEnd: () => void,
): ITypedTreeHandler<EventAnnotation> {
    function buildValue(
        value: Value,
    ): ITypedValueHandler<EventAnnotation> {
        return {
            onDictionary: () => {
                const dict: Dictionary = {}
                value.type = ["dictionary", dict]
                return {
                    onClose: () => { },
                    onEntry: ($) => {
                        const entry: Value = { type: null }
                        dict[$.token.token.value] = entry
                        return buildValue(
                            entry,
                        )
                    },
                }
            },
            onList: () => {
                const list: Value[] = []
                value.type = ["list", list]
                return {
                    onClose: () => { },
                    onElement: () => {
                        const element: Value = { type: null }
                        list.push(element)
                        return buildValue(
                            element,
                        )
                    },
                }
            },
            onTaggedUnion: ($) => {
                const taggedUnion: DSTaggedUnion = {
                    option: null,
                    value: { type: null },
                }
                value.type = ["tagged union", taggedUnion]
                return {
                    onUnexpectedOption: () => {
                        taggedUnion.option = $.definition["default option"].name
                        return buildValue(
                            taggedUnion.value,
                        )
                    },
                    onOption: ($$) => {
                        taggedUnion.option = $$.name
                        return buildValue(
                            taggedUnion.value,
                        )
                    },
                    onEnd: () => { },
                }
            },
            onSimpleString: ($) => {
                value.type = ["simple string", $.value]
            },
            onMultilineString: ($) => {
                value.type = ["multiline string", $.token === null ? [] : $.token.token.lines]
            },
            onTypeReference: () => {
                return buildValue(
                    value,
                )
            },
            onGroup: () => {
                const group: Group = {}
                value.type = ["group", group]
                return {
                    onUnexpectedProperty: () => { },
                    onProperty: ($) => {
                        const property: Value = { type: null }
                        group[$.key] = property
                        return buildValue(
                            property,
                        )
                    },
                    onClose: () => { },
                }
            },
        }
    }
    return {
        root: buildValue(
            ds.root,
        ),
        onEnd: () => {
            onEnd()
        },
    }
}
