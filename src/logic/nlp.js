import {NerManager} from "node-nlp";
import {getAllDimensionValues, getAllIndicators} from "../data";
import * as Constants from "../constants";

export const aggregationTypes = [
    {
        name: 'Average',
        value: 'AVG'
    }, {
        name: "Count",
        value: 'COUNT'
    }, {
        name: 'Minimum',
        value: 'MIN'
    }, {
        name: 'Maximum',
        value: 'MAX'
    }, {
        name: 'Total',
        value: 'SUM'
    }
];

export let LanguageService = function (language = 'en') {
    this.language = language;
};

LanguageService.prototype.init = async function () {
    this.entityDetector = await createEntityDetector(this.language);
};

LanguageService.prototype.findEntities = function (string, whitelist) {
    return this.entityDetector.findEntities(string, [this.language], whitelist);
};

async function createEntityDetector(language) {
    const entityDetector = new NerManager({ threshold: 0.85 });

    let promiseKPI = getAllIndicators();
    let promiseDimensionValue = getAllDimensionValues();

    let kpiList = await promiseKPI;
    let dimensionValueList = await promiseDimensionValue;

    kpiList.forEach(kpi => {
        entityDetector.addNamedEntityText(Constants.KPI, kpi.KPI_ID, [language], [kpi.KPI_NAME]);
    });

    dimensionValueList.forEach(dimensionValue => {
        entityDetector.addNamedEntityText(Constants.DIMENSION_VALUE, dimensionValue.DIMENSION_VALUE_ID,
            [language], [dimensionValue.DIMENSION_VALUE]);
    });

    aggregationTypes.forEach(aggregationType => {
        entityDetector.addNamedEntityText(Constants.AGGREGATION_TYPE, aggregationType.value,
            [language], [aggregationType.name, aggregationType.value]);
    });

    return entityDetector;
}