import * as pr from "pareto-runtime"

import * as api from "../interface"

import * as def from "astn-typedtreehandler-api"

import { IFormatInstructionWriter } from "astn-serializer-api"
import { ContentToken } from "astn-tokenconsumer-api"
import { IContentTokenConsumer } from "astn-tokenconsumer-api"
/* eslint
    "@typescript-eslint/no-shadow": 0,
*/

import { TypeDefinition, ValueDefinition } from "astn-typedtreehandler-api"

import { getElement } from "pareto-runtime"
import { CreateAnnotater } from "../interface/interfaces/CreateAnnotater"
import { CreateTreeParserAndHandleErrors } from "../interface/interfaces/CreateTreeParser"
import { CreateASTNNormalizer } from "../interface/interfaces/CreateASTNNormalizer"

interface IOut<LeafEvent, BlockEvent> {
    sendEvent(event: LeafEvent): void
    sendBlock(
        event: BlockEvent,
        callback: (out: IOut<LeafEvent, BlockEvent>) => void,
    ): void
}

export type SerializeOut = IOut<ContentToken, {
    open: ContentToken
    close: ContentToken
}>

function onValueIsNonDefault(
    value: api.IMarshallableValue,
    definition: ValueDefinition,
    callback: () => void,
): void {
    switch (definition.type[0]) {
        case "type reference": {
            const $ = definition.type[1]
            onValueIsNonDefault(
                value,
                $.type.get().value,
                callback
            )
            break
        }
        case "dictionary": {
            value.toDictionary((dict) => {
                if (!dict.entries.isEmpty()) {
                    callback()

                }
            })
            break
        }
        case "list": {
            value.toList((list) => {
                if (!list.elements.isEmpty()) {
                    callback()
                }
            })
            break
        }
        case "tagged union": {
            const $ = definition.type[1]
            value.toTaggedUnion((tu) => {
                if (tu.option !== $["default option"].name) {
                    callback()
                } else {
                    onValueIsNonDefault(
                        tu.value,
                        $.options.getLookup().getUnsafe(tu.option).value,
                        callback,
                    )
                }
            })
            break
        }
        case "simple string": {
            const $ = definition.type[1]
            value.toSimpleString((str) => {
                if (str !== $["default value"]) {
                    callback()
                }
            })
            break
        }
        case "multiline string": {
            value.toMultilineString((lines) => {
                if (lines.length > 1) {
                    callback()
                }
                if (lines.length === 1 && getElement(lines, 0) !== "") {
                    callback()
                }
            })
            break
        }
        case "group": {
            const $ = definition.type[1]
            value.toGroup((group) => {
                let foundNonDefault = false
                $.properties.forEach((p, key) => {
                    group.onProperty(key, (value) => {
                        onValueIsNonDefault(
                            value,
                            p.value,
                            () => {
                                foundNonDefault = true
                            }
                        )
                    })
                })
                if (foundNonDefault) {
                    callback()
                }
            })
            break
        }
        default:
            return pr.au(definition.type[0])
    }
}

export function marshallDataset(
    dataset: api.IMarshallableDataset,
    definition: TypeDefinition,
    out: SerializeOut,
    style: api.SerializationStyle,
): void {
    marshallValue(
        dataset.root,
        definition.value,
        out,
        style,
        false,
    )
}

function marshallValue(
    value: api.IMarshallableValue,
    definition: ValueDefinition,
    out: SerializeOut,
    style: api.SerializationStyle,
    inMixinMode: boolean,
): void {
    switch (definition.type[0]) {
        case "dictionary": {
            const $ = definition.type[1]
            value.toDictionary((dict) => {
                out.sendBlock(
                    {
                        open: ["structural", {
                            "type": ["open dictionary", {}],
                        }],
                        close: ["structural", {
                            "type": ["close dictionary", {}],
                        }],
                    },
                    (out) => {
                        dict.entries.forEach((entry, key) => {
                            out.sendEvent(["simple string", {
                                value: key,
                                wrapping: ["quote", {}],
                            }])
                            marshallValue(
                                entry,
                                $.value,
                                out,
                                style,
                                false,
                            )
                        })
                    },
                )
            })
            break
        }
        case "list": {
            const $$ = definition.type[1]
            value.toList((list) => {
                out.sendBlock(
                    {
                        open: ["structural", {
                            "type": ["open shorthand group", {}],
                        }],
                        close:
                            ["structural", {
                                "type": ["close shorthand group", {}],
                            }],
                    },
                    (out) => {
                        list.elements.forEach((e) => {
                            marshallValue(
                                e,
                                $$.value,
                                out,
                                style,
                                false,
                            )
                        })
                    },
                )
            })
            break
        }
        case "type reference": {
            const $ = definition.type[1]
            marshallValue(
                value,
                $.type.get().value,
                out,
                style,
                inMixinMode,
            )
            break
        }
        case "tagged union": {
            const $ = definition.type[1]
            value.toTaggedUnion((taggedUnion) => {
                if (!inMixinMode) {
                    out.sendEvent(["structural", {
                        "type": ["tagged union start", {}],
                    }])
                }
                if (taggedUnion.option !== null) {
                    out.sendEvent(["simple string", {
                        value: taggedUnion.option,
                        wrapping: ["apostrophe", {}],
                    }])
                    marshallValue(
                        taggedUnion.value,
                        $.options.getLookup().getUnsafe(taggedUnion.option).value,
                        out,
                        style,
                        inMixinMode
                    )
                }
            })
            break
        }
        case "simple string": {
            const $ = definition.type[1]
            value.toSimpleString((str) => {
                out.sendEvent(["simple string", {
                    value: str,
                    wrapping: $.quoted
                        ? ["quote", {}]
                        : ["none", {}],
                }])
            })
            break
        }
        case "multiline string": {
            value.toMultilineString((lines) => {
                out.sendEvent(["multiline string", {
                    lines: lines,
                }])
            })
            break
        }
        case "group": {
            const $ = definition.type[1]
            value.toGroup((group) => {
                if (inMixinMode) {
                    $.properties.forEach((propDef, key) => {
                        group.onProperty(key, (prop) => {
                            marshallValue(
                                prop,
                                propDef.value,
                                out,
                                style,
                                true,
                            )

                        })
                    })
                } else {
                    switch (style[0]) {
                        case "expanded": {
                            const expandedStyle = style[1]
                            out.sendBlock(
                                {
                                    open: ["structural", {
                                        "type": ["open verbose group", {}],
                                    }],
                                    close: ["structural", {
                                        "type": ["close verbose group", {}],
                                    }],
                                },
                                (out) => {
                                    $.properties.forEach((propDef, key) => {
                                        group.onProperty(key, (prop) => {
                                            function serializeProperty() {
                                                out.sendEvent(["simple string", {
                                                    value: key,
                                                    wrapping: ["apostrophe", {}],
                                                }])
                                                marshallValue(
                                                    prop,
                                                    propDef.value,
                                                    out,
                                                    style,
                                                    false,
                                                )

                                            }
                                            if (expandedStyle.omitPropertiesWithDefaultValues) {
                                                onValueIsNonDefault(
                                                    prop,
                                                    propDef.value,
                                                    () => {
                                                        serializeProperty()
                                                    }
                                                )
                                            } else {
                                                serializeProperty()
                                            }

                                        })
                                    })
                                },
                            )
                            break
                        }
                        case "compact": {
                            out.sendBlock(
                                {
                                    open: ["structural", {
                                        "type": ["open shorthand group", {}],
                                    }],
                                    close: ["structural", {
                                        "type": ["close shorthand group", {}],
                                    }],
                                },
                                (out) => {
                                    $.properties.forEach((propDef, key) => {
                                        group.onProperty(key, (prop) => {
                                            marshallValue(
                                                prop,
                                                propDef.value,
                                                out,
                                                style,
                                                true,
                                            )
                                        })
                                    })
                                },
                            )
                            break
                        }
                        default:
                            pr.au(style[0])
                    }
                }

            })
            break
        }
        default:
            pr.au(definition.type[0])
    }
}

export function marshall(
    dataset: api.IMarshallableDataset,
    schema: def.Schema,
    internalSchemaSpecification: api.InternalSchemaSpecification,
    style: api.SerializationStyle,
    writer: (str: string) => void,
    annotate: CreateAnnotater<null>,
    createTreeParser: CreateTreeParserAndHandleErrors<null>,
    createASTNNormalizer: CreateASTNNormalizer<null>,
    serializeSchema: (schema: def.Schema, sendEvent: (event: ContentToken) => void) => void,
    createSerializedQuotedString: (value: string) => string,
): void {
    const newline = "\r\n"
    const indentationString = "    "


    const writer2: IFormatInstructionWriter<null> = {
        token: (instruction) => {
            writer(instruction.stringBefore)
            writer(instruction.token)
            writer(instruction.stringAfter)

        },
        nonToken: (instruction) => {
            writer(instruction.string)
        },
    }

    function handleEvent<EventAnnotation>(
        event: ContentToken,
        annotation: EventAnnotation,
        parser: IContentTokenConsumer<EventAnnotation>,
    ): void {
        parser.onToken({
            annotation: annotation,
            token: event,
        })
    }

    switch (internalSchemaSpecification[0]) {
        case "embedded": {
            writer(`! ! "astn/schema@0.1" `)
            const embeddedSchemaParser = createTreeParser({
                handler: annotate(
                    createASTNNormalizer(
                        {
                            indentationString: indentationString,
                            newline: newline,
                        },
                        {
                            writer: writer2,
                        },
                    )
                ),
                onError: ($) => {
                    throw new Error(`unexpected error in schema`)

                },
            })
            serializeSchema(
                schema,
                (event) => {
                    handleEvent(event, null, embeddedSchemaParser)
                },
            )
            break
        }
        case "none": {
            break
        }
        case "reference": {
            const $ = internalSchemaSpecification[1]
            writer(`! ${createSerializedQuotedString($.name)}${newline}`)
            break
        }
        default:
            pr.au(internalSchemaSpecification[0])
    }

    const bodyParser = createTreeParser({
        handler: annotate(
            createASTNNormalizer(
                {
                    indentationString: indentationString,
                    newline: newline,
                },
                {
                    writer: writer2,
                },
            )
        ),
        onError: () => {
            throw new Error(`unexpected error in schema`)
        },
    })

    function createOut(): SerializeOut {
        function he(event: ContentToken) {
            handleEvent(event, null, bodyParser)
        }
        return {
            sendBlock: (eventpair, callback) => {
                he(eventpair.open)
                callback(createOut())
                he(eventpair.close)
            },
            sendEvent: (event) => {
                he(event)
            },
        }
    }
    marshallDataset(
        dataset,
        schema["root type"].get(),
        createOut(),
        style,
    )
}
