import { IAnnotatedHandler } from "astn-serializer-api";
import { ITreeHandler } from "astn-handlers-api";

export type CreateAnnotater<InTokenAnnotation> = (
    handler: IAnnotatedHandler<InTokenAnnotation>,
) => ITreeHandler<InTokenAnnotation>