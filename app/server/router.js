import * as express from "express";
import {
    getAllDimensions,
    getAllDimensionValues,
    getAllIndicators,
    getDimensionName,
    getDimensionsByIndicator,
    getDimensionValuesByDimension,
    getIndicatorName
} from "../data";
import {ParserService} from "../logic/parser";

export const router = express.Router();

// Middleware to prettify/filter/sort JSON result
router.use((req, res, next) => {
    let oldSend = res.send;
    res.set('Content-Type', 'application/json');
    res.send = function (obj) {
        if (typeof obj === 'object') {
            // Allow to hide all fields except the ones passed in the query
            let attributes = req.query.fields !== undefined ? req.query.fields.split(',') : null;

            // Allow to indent the JSON output in the query (?indent=4 and ?pretty are the same)
            let indent = !isNaN(parseInt(req.query.indent)) && parseInt(req.query.indent) >= 0 ? parseInt(req.query.indent) : 0;
            if (req.query.pretty !== undefined && indent === 0) indent = 4;

            // Allow arrays to be filtered by field values (?filter=name:Dana,id:0)
            let filters = req.query.filter !== undefined ? req.query.filter.split(',') : undefined;
            if (Array.isArray(obj) && filters !== undefined) {
                let filteredObj = [];
                filters.forEach(filter => {
                    filter = filter.split(':');
                    if (filter.length === 2)
                        filteredObj.push(...obj.filter(e =>
                            e[filter[0]] === (isNaN(parseInt(filter[1])) ? filter[1] : parseInt(filter[1]))));
                });
                obj = filteredObj;
            }

            // Allow arrays to be sorted by a field (?sort=name&order=asc)
            if (Array.isArray(obj) && req.query.sort !== undefined) {
                obj.sort(function (a, b) {
                    if (a[req.query.sort] > b[req.query.sort]) return req.query.order === 'desc' ? -1 : 1;
                    else if (a[req.query.sort] < b[req.query.sort]) return req.query.order === 'desc' ? 1 : -1;
                    return 0;
                });
            }

            // Finally send the formatted JSON
            oldSend.call(this, JSON.stringify(obj, attributes, indent));
        } else oldSend.call(this, obj);
    };
    next();
});

router.get('/', (req, res) => {
    res.send([
        "/api/indicators",
        "/api/indicators/:id",
        "/api/dimensions",
        "/api/dimensions/:id",
        "/api/dimensionValues",
        "/api/ask"
    ]);
});

router.get('/indicators', (req, res) => {
    getAllIndicators().then(result => res.send(result));
});

router.get('/indicators/:id', (req, res) => {
    getIndicatorName(req.params.id).then(name => {
        getDimensionsByIndicator(req.params.id).then(result => res.send({
            KPI_ID: req.params.id,
            KPI_NAME: name,
            DIMENSIONS: result
        }));
    });
});

router.get('/dimensions', (req, res) => {
    getAllDimensions().then(result => res.send(result));
});

router.get('/dimensions/:id', (req, res) => {
    getDimensionName(req.params.id).then(name => {
        getDimensionValuesByDimension(req.params.id).then(result => res.send({
            DIMENSION_ID: req.params.id,
            DIMENSION_NAME: name,
            DIMENSION_VALUES: result
        }));
    });
});

router.get('/dimensionValues', (req, res) => {
    getAllDimensionValues().then(result => res.send(result));
});

router.get('/ask', (req, res) => {
    let question = req.query.question !== undefined ? req.query.question.replace(/["]+/g, '') : '';
    let parserService = new ParserService();
    parserService.init().then(() => {
        parserService.parse(question).then(result => res.send(result));
    });
});