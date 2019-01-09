import _ from 'lodash';
import converter from "number-to-words";
import countryDetector from "country-in-text-detector";

import {aggregationTypes, LanguageService} from "./nlp";
import {AGGREGATION_TYPE, DATE_RANGE, DIMENSION_VALUE, KPI} from "../constants";
import {getAllDimensionValues, getAllIndicators} from "../data";
import {queryFromServer} from "../data/connector";
import {databaseModel} from "../data/databaseModel";
import {getDimensionsByIndicator} from "../../dist/data";

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
    let results = await this.obtainResults(question, query);
    let response = this.generateSpokenResponse(query, results);

    // Add current query to previousQueries stack
    this.previousQueries.unshift(query);

    let result = {
        query: {question, ...query},
        response,
        results
    };

    databaseModel.create({data: result});

    return result;
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
    };
};

ParserService.prototype.obtainResults = async function (question, query) {
    let results = [];

    try {
        // TODO: Context aware, get previous query dimensions
        if (query.dimensions.length === 0) {
        }

        if (query.indicators.length > 0) {
            // For each indicator compute a database query and build a result
            let promises = query.indicators.map(indicator => makeRequestToServer(question, indicator, query));
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
            partial.min = Math.min(...result.data);
            partial.max = Math.max(...result.data);
            partial.spoken += 'Total: ' + converter.toWords(partial.sum) + '. ';
            partial.spoken += 'Average: ' + converter.toWords(partial.avg) + '. ';
        }
        if (result.data.length > 0) response.push(partial);
    });

    if (response.length === 0) {
        response.push({spoken: 'Sorry, I could not find any relevant information for your query.'});
    }

    return response;
};

function makeRequestToServer(question, indicator, query) {
    return new Promise(async function (resolve, reject) {
        let requestQuery = JSON.parse(JSON.stringify(query));
        let params = [];

        // Replace country names with country iso3166 codes
        let countryDimensionIndex = requestQuery.dimensions.findIndex(dimension => dimension.DIMENSION_NAME === 'COUNTRY');
        if (countryDimensionIndex !== -1) {
            let detectedDimension = requestQuery.dimensions[countryDimensionIndex];
            let detectedCountry = countryDetector.detect(question).find(result => result.matches.find(string =>
                string.toString().toUpperCase() === detectedDimension.DIMENSION_VALUE.toUpperCase()));
            if (detectedCountry !== undefined)
                detectedDimension.DIMENSION_VALUE = detectedCountry.iso3166;
        }

        // Intersect the dimensions to show only the common ones
        let dimensions_indicators = await getDimensionsByIndicator(indicator.KPI_ID);

        let dimensions_id_query = requestQuery.dimensions.map(dimension => dimension.DIMENSION_ID);
        let dimensions_id_indicators = dimensions_indicators.map(dimension => dimension.DIMENSION_ID);
        let dimensions_intersection = _.intersection(dimensions_id_query, dimensions_id_indicators);

        let final_dimensions = [];
        for (var i = 0; i < dimensions_intersection.length; i++){
            for (var j = 0; j < requestQuery.dimensions.length; j++){
                if (dimensions_intersection[i] === requestQuery.dimensions[j].DIMENSION_ID)
                    final_dimensions.push(requestQuery.dimensions[j]);
            };
        };

        //requestQuery.dimensions.forEach(dimension => params.push({
        final_dimensions.forEach(dimension => params.push({
            name: dimension.DIMENSION_NAME,
            value: dimension.DIMENSION_VALUE,
            compare: 'LIKE'
        }));

        // TODO: Add time range hard-coding month, day, year...

        try {
            let result = await queryFromServer(indicator, params, requestQuery.aggregationTypes);
            resolve({...result, indicator, params, aggregation: requestQuery.aggregationTypes});
        } catch (error) {
            reject(error);
        }
    });
}