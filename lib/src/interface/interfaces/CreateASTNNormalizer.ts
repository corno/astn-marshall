import { IAnnotatedHandler, IFormatInstructionWriter } from "astn-serializer-api";

export type CreateASTNNormalizer<EventAnnotation> = (
    $: {
        indentationString: string
        newline: string
    },
    $p: {
        writer: IFormatInstructionWriter<EventAnnotation>
    },
) => IAnnotatedHandler<EventAnnotation>