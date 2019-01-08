import converter from "number-to-words";

import {aggregationTypes, LanguageService} from "./nlp";
import {AGGREGATION_TYPE, DATE_RANGE, DIMENSION_VALUE, KPI} from "../constants";
import {getAllDimensionValues, getAllIndicators} from "../data";
import {queryFromServer} from "../data/connector";

export let ParserService = function () {
    this.previousQueries = [];
};

ParserService.prototype.init = async function () {
    let promiseKPI = getAllIndicators();
    let promiseDimensionValue = getAllDimensionValues();

    this.indicators = await promiseKPI;
    this.dimensionValues = await promiseDimensionValue;
};

ParserService.prototype.parse = async function (question) {
    let query = await this.parseQuestion(question);
    let results = await this.obtainResults(query);
    let response = this.generateSpokenResponse(query, results);

    // Add current query to previousQueries stack
    this.previousQueries.unshift(query);

    return {
        question,
        response,
        query,
        results
    };
};

ParserService.prototype.parseQuestion = async function (question) {
    let nlpService = new LanguageService('en');
    await nlpService.init();

    let entities = await nlpService.findEntities(question);

    let detectedIndicators = entities.filter(e => e.entity === KPI)
        .map(e => parseInt(e.option))
        .map(id => this.indicators.find(indicator => indicator.KPI_ID === id));
    let detectedDimensionValues = entities.filter(e => e.entity === DIMENSION_VALUE)
        .map(e => parseInt(e.option))
        .map(id => this.dimensionValues.find(dimensionValue => dimensionValue.DIMENSION_VALUE_ID === id));
    let detectedTimeRanges = entities.filter(e => e.entity === DATE_RANGE)
        .map(e => e.resolution);
    let detectedAggregationTypes = entities.filter(e => e.entity === AGGREGATION_TYPE)
        .map(e => e.option)
        .map(id => aggregationTypes.find(aggregationType => aggregationType.value === id));

    return {
        indicators: detectedIndicators,
        dimensions: detectedDimensionValues,
        timeRanges: detectedTimeRanges,
        aggregationTypes: detectedAggregationTypes
    }
};

ParserService.prototype.obtainResults = async function (query) {
    let results = [];

    try {
        if (query.indicators.length > 0) {
            // For each indicator compute a database query and build a result
            let promises = query.indicators.map(indicator => makeRequestToServer(indicator, query));
            results = await Promise.all(promises);
        } else {
            // TODO: Context aware (As there are no indicators found use the previous query)
        }
    } catch (error) {
        console.error(error);
    }

    return results;
};

ParserService.prototype.generateSpokenResponse = function (query, results) {
    let response = [];

    results.forEach(result => {
        let partial = {spoken: ''};
        partial.spoken += 'These are the results for indicator ' + result.indicator.KPI_NAME + ' ';
        for (let i = 0; i < query.dimensions.length; ++i) {
            if (i === 0) partial.spoken += 'in ';
            else if (i === query.dimensions.length - 1) partial.spoken += 'and ';
            partial.spoken += query.dimensions[i].DIMENSION_NAME + ' ' + query.dimensions[i].DIMENSION_VALUE + ', ';
        }
        if (result.data.length === 1) {
            partial.value = result.data;
            partial.spoken += converter.toWords(partial.value) + '. ';
        } else if (result.data.length > 1) {
            partial.sum = result.data.reduce((a, b) => a + b, 0);
            partial.avg = partial.sum / result.data.length;
            partial.spoken += 'Total: ' + converter.toWords(partial.sum) + '. ';
            partial.spoken += 'Average: ' + converter.toWords(partial.avg) + '. ';
        }
        if (result.data.length > 0) response.push(partial);
    });

    if (response.length === 0) {
        response.push('Sorry, I could not find any relevant information for your query.')
    }

    return response;
};

function makeRequestToServer(indicator, query) {
    return new Promise(async function (resolve, reject) {
        let params = [];

        // TODO: Filter out those dimensions that are not found in the indicator
        query.dimensions.forEach(dimension => params.push({
            name: dimension.DIMENSION_NAME,
            value: dimension.DIMENSION_VALUE,
            compare: 'LIKE'
        }));

        // TODO: Add time range hard-coding month, day, year...

        try {
            let result = await queryFromServer(indicator, params, query.aggregationTypes);
            resolve({...result, indicator, params});
        } catch (error) {
            reject(error);
        }

    });
}