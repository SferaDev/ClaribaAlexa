import {getFromServer} from './connector';

const BASE_URL_GENIE = 'https://irca1b213eeb.hana.ondemand.com/GENIE_DEMO/services.xsodata';

/**
 * Returns an array of KPIs
 * @fulfil Array({KPI_ID: Integer, KPI_NAME: String, KPI_DESCRIPTION: String})
 * @return {Promise<*>}
 */
export async function getAllIndicators() {
    return await getFromServer(BASE_URL_GENIE + '/KPI_INFO_ALEXA');
}

/**
 * Returns an array of Dimensions
 * @fulfil Array({DIMENSION_ID: Integer, DIMENSION_NAME: String})
 * @return {Promise<*>}
 */
export async function getAllDimensions() {
    return await getFromServer(BASE_URL_GENIE + '/DIMENSION_ALEXA');
}

/**
 * Returns an array of Dimension Values
 * @fulfil Array({DIMENSION_VALUE_ID: Integer, DIMENSION_ID: Integer, DIMENSION_NAME: String, DIMENSION_VALUE: String})
 * @return {Promise<*>}
 */
export async function getAllDimensionValues() {
    return await getFromServer(BASE_URL_GENIE + '/DIMENSION_VALUE_ALEXA');
}

/**
 * Returns the dimension that matches a given dimensionValue id
 * @param dimensionValue
 * @return {Promise<*>}
 */
export async function getDimensionValueById(dimensionValue) {
    let dimensionValues = await getAllDimensionValues();
    return dimensionValues.find(e => e.DIMENSION_ID === parseInt(dimensionValue));
}

/**
 * Returns the dimensions of a given KPI
 * @param kpi
 * @return {Promise<*>}
 */
export async function getDimensionsByIndicator(kpi) {
    let dimensions = getAllDimensions();
    let result = await getFromServer(BASE_URL_GENIE + '/KPI_DIMENSIONS_ALEXA', {
        $filter: "KPI_ID eq " + kpi
    });
    dimensions = await dimensions;
    return result.map(e => {
        let dimension = dimensions.find(d => d.DIMENSION_NAME.localeCompare(e.DIMENSION_VALUE.toUpperCase()) === 0);
        if (dimension !== undefined) {
            return {
                DIMENSION: e.DIMENSION,
                DIMENSION_ID: dimension.DIMENSION_ID,
                DIMENSION_NAME: dimension.DIMENSION_NAME
            };
        }
        return null;
    });
}

/**
 * Returns the dimensionValues of a given dimension
 * @param dimension
 * @return {Promise<*>}
 */
export async function getDimensionValuesByDimension(dimension) {
    let dimensionValues = await getAllDimensionValues();
    return dimensionValues.filter(e => e.DIMENSION_ID === parseInt(dimension));
}

/**
 * Returns the name of a given KPI
 * @param kpi
 * @return string
 */
export async function getIndicatorName(kpi) {
    let allKPI = await getAllIndicators();
    let result = allKPI.find(e => e.KPI_ID === parseInt(kpi));
    return result !== undefined ? result.KPI_NAME : undefined;
}

/**
 * Returns the name of a given KPI
 * @param dimension
 * @return string
 */
export async function getDimensionName(dimension) {
    let allDimensions = await getAllDimensions();
    let result = allDimensions.find(e => e.DIMENSION_ID === parseInt(dimension));
    return result !== undefined ? result.DIMENSION_NAME : undefined;
}