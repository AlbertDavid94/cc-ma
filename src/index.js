"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
// restrict input to these files
const allowed_input_files = ['mesh.json', 'mesh_x_sin_cos_10000.json', 'mesh_x_sin_cos_20000.json'];
/** help template */
const HELP = (0, fs_1.readFileSync)(`src/assets/help.txt`, 'utf-8');
/** validate arguments. In the case of invalid arguments, output error messages */
var mesh_file = process.argv[2];
let number_of_view_spots = 0;
try {
    number_of_view_spots = parseInt(process.argv[3]);
    if (number_of_view_spots < 0)
        throw 'Number of viewing spots must be positive';
    if (allowed_input_files.indexOf(mesh_file) == -1)
        throw 'Input file does not exist';
}
catch (_a) {
    console.error('ERROR: Invalid arguments\n');
    console.info(HELP);
    process.exit(1);
}
/** read mesh_file and parse to json */
let data = {};
try {
    const f = (0, fs_1.readFileSync)(`src/assets/${mesh_file}`, 'utf-8');
    data = JSON.parse(f);
}
catch (_b) {
    console.error(`ERROR: contents in ${mesh_file} are not valid. Exiting...`);
    process.exit(1);
}
// collect all nodes in a map for easier access
let nodes = new Map();
for (const node of data['nodes']) {
    nodes.set(node['id'], {
        id: node['id'],
        x: node['x'],
        y: node['y'],
        elements: []
    });
}
// collect all elements in a map for easier access
let elements = new Map();
for (const element of data['elements']) {
    elements.set(element['id'], {
        id: element['id'],
        nodes: element['nodes'].map(x => nodes.get(x)),
        value: 0
    });
    // make cross references for each element to its nodes
    for (const node_id of element['nodes']) {
        const node = nodes.get(node_id);
        node === null || node === void 0 ? void 0 : node.elements.push(elements.get(element['id']));
    }
}
// setting values to each element
for (const value of data['values']) {
    const element = elements.get(value['element_id']);
    element.value = value['value'];
}
// helper function to get all neighbouring elements, runs in O(n*k)
function get_neighbouring_elements(element) {
    let neighbours = new Map();
    for (const node of element.nodes)
        for (const element of node.elements)
            neighbours.set(element.id, element);
    return Array.from(neighbours.values());
}
// compare value of element with values of neighbouring elements
function is_local_maxima(element) {
    const current_value = element.value;
    for (const neighbour of get_neighbouring_elements(element))
        if (neighbour.value > current_value)
            return false;
    return true;
}
// iterate over each element and check whether or not it is a local maxima
// local maxima is true when its neighbouring elements have lower values
let results = [];
for (const element of elements.values())
    if (is_local_maxima(element))
        results.push(element);
// sort by value, in descending order
results.sort((a, b) => b.value - a.value);
// reduce the number of results to the number of viewing spots
if (results.length > number_of_view_spots)
    results = results.splice(0, results.length - (results.length - number_of_view_spots));
// output the results
console.log(results.map((x) => { return { 'element_id': x.id, 'value': x.value }; }));
