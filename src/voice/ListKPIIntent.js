import {getAllIndicators} from "../data";

export default async function () {
    let result;
    let kpiList = await getAllIndicators();
    let random = Math.round(Math.random() * 100); // Be ware, if there're < 3, it will output duplicated results
    result = [
        'There are ' + kpiList.length + ' indicators.',
        'Here you have three examples!',
        '1: ' + kpiList[(random)%kpiList.length].KPI_NAME + '.',
        '2: ' + kpiList[(random + 1)%kpiList.length].KPI_NAME + '.',
        '3: ' + kpiList[(random + 2)%kpiList.length].KPI_NAME + '.'
    ];
    this.tell(result.join(' '));
}