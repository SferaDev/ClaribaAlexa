import {App} from "jovo-framework";

import MainIntent from "./MainIntent";
import QueryIntent from "./QueryIntent";

export const index = new App({
    logging: true,
});

index.setHandler({
    'LAUNCH': MainIntent,
    'QUERY': QueryIntent
});