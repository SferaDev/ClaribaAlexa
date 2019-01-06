import 'babel-polyfill';
import express from 'express';
import {Webhook} from 'jovo-framework';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';

import {index} from './voice/app.js';
import {apiRouter} from "./apiRouter";

const port = process.env.PORT || 3000;

Webhook.listen(port, () => {
    console.log(`Example server listening on port ${port}!`);
});

Webhook.use('/', express.static('docs'));

Webhook.use('/docs', swaggerUi.serve, swaggerUi.setup(yaml.load('./docs/api.yaml')));

Webhook.post('/webhook', (req, res) => {
    index.handleWebhook(req, res);
});

Webhook.use('/api', apiRouter);

Webhook.use('/dashboard', express.static('dashboard'));