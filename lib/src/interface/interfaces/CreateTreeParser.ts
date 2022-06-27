import { IContentTokenConsumer } from "astn-tokenconsumer-api";
import { ITreeHandler } from "astn-handlers-api";
import { ParsingError } from "astn-parser-api";

export type CreateTreeHandlerAndHandleErrorsParams<EventAnnotation> = {
    handler: ITreeHandler<EventAnnotation> | null
    onError: ($: {
        error: ParsingError
        annotation: EventAnnotation
    }) => void
}

export type CreateTreeParserAndHandleErrors<EventAnnotation> = (
    $p: CreateTreeHandlerAndHandleErrorsParams<EventAnnotation>
) => IContentTokenConsumer<EventAnnotation>
