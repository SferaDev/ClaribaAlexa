import 'babel-polyfill';
import express from 'express';
import {Webhook} from 'jovo-framework';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import mongoose from 'mongoose';

import {app} from '../app';
import {router} from './router';

const port = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/ClaribaGenie';

mongoose.Promise = global.Promise;
mongoose.connect(MONGODB_URI, function (error) {
    if (error) console.error(error);
    else console.log('MongoDB connected');
});

Webhook.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

Webhook.use('/', express.static('docs'));

Webhook.use('/docs', swaggerUi.serve, swaggerUi.setup(yaml.load('./docs/api.yaml')));

Webhook.post('/webhook', (req, res) => {
    app.handleWebhook(req, res);
});

Webhook.use('/api', router);

Webhook.use('/dashboard', express.static('dashboard'));