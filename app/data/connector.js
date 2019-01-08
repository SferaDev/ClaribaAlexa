import axios from 'axios';
import {setupCache} from 'axios-cache-adapter'

const compareTypes = [
    '=', '>', '<', '<>', 'LIKE', 'EXISTS', 'BETWEEN', 'IN', 'NULL', 'CONTAINS'
];

const cache = setupCache({
    maxAge: 15 * 1000 // 15 minutes
});

let axiosInstance = axios.create({
    adapter: cache.adapter
});

export function getFromServer(url, parameters = {}) {
    return new Promise(function (resolve, reject) {
        axiosInstance.get(url, {
            params: {
                $format: 'json',
                ...parameters
            }
        }).then(result => {
            let data = result.data;
            if (data['d']) data = data['d'];
            if (data['results']) data = data['results'];
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item['__metadata']) delete item['__metadata'];
                });
            } else if (data['__metadata']) {
                delete data['__metadata'];
            }
            resolve(data);
        }).catch(error => {
            console.error(error);
            reject(new Error("Petition failed"));
        });
    });
}

export function queryFromServer(indicator, dimensions, aggregationTypes = []) {
    return new Promise(async function (resolve, reject) {
        let dimension_names = dimensions.map(dimension => dimension.name);
        let dimension_values = dimensions.map(dimension => dimension.value);
        let dimension_compare = dimensions.map(dimension => dimension.compare);

        let serverHost = 'https://irca1b213eeb.hana.ondemand.com';
        let serverUrl = serverHost + '/ALEXA_PROJECT/KPI_SEARCH.xsjs';
        let parameters = {
            kpi_name: indicator.KPI_NAME,
            dimension_names: dimension_names.join('$'),
            dimension_values: dimension_values.map(a => '\'' + a + '\'').join('$'),
            compare_types: dimension_compare.map(a => compareTypes.includes(a) ? a : '=').join('$')
        };

        // Add aggregationType if defined
        if (aggregationTypes.length > 0) parameters.agregation_type = aggregationTypes[0];

        axiosInstance.get(serverUrl, {
            params: parameters
        }).then(result => {
            let data = JSON.parse(result.data.substr('The result is: '.length));
            data = data.map(e => !isNaN(e) ? parseFloat(e) : 0);
            resolve({
                url: serverHost + result.request.path,
                data
            });
        }).catch(error => {
            reject({
                error
            })
        });
    });
}