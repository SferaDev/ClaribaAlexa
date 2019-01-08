import {App} from "jovo-framework";

import {ParserService} from "./logic/parser";

export const app = new App({
    logging: true,
});

let parserService = new ParserService();
parserService.init().then(() => {
    app.setHandler({
        'LAUNCH': function() {
            this.ask('Welcome to Clariba Genie! What do you want to know?',
                'Please perform a query to Clariba Genie!');
        },
        'QueryIntent': function() {
            let question = this.getInput('UserInput').value;
            parserService.parse(question).then(result => {
                let speech = this.speechBuilder();
                result.response.forEach(response => {
                    speech.addText(response.spoken);
                });
                this.tell(speech);
            });
        },
        'Unhandled': function() {
            this.tell('Sorry, I did not detect any query in your response.');
        }
    });
});

