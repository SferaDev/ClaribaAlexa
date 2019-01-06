import {App} from "jovo-framework";

import MainIntent from "./MainIntent";
import QueryIntent from "./QueryIntent";

export const app = new App({
    logging: true,
});

app.setHandler({
    'LAUNCH': MainIntent,
    'QUERY': QueryIntent
});