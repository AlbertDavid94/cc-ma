import { readFileSync, writeFile } from "fs";
import { MeshNode } from './entities/mesh_node';
import { MeshElement } from './entities/mesh_element';

var start = new Date().getTime();

const allowed_input_files = ['mesh.json', 'mesh_x_sin_cos_10000.json', 'mesh_x_sin_cos_20000.json'];
const value = allowed_input_files[2];
var mesh_file = process.argv[2] || value;
var number_of_view_spots = process.argv[3] || 1;

if (allowed_input_files.indexOf(mesh_file) == -1) {
    console.error(`Input file should be one of following:\n \t${allowed_input_files.join('\n\t')}`);
    process.exit(1);
}

const f = readFileSync(`src/assets/${mesh_file}`, 'utf-8');
const data = JSON.parse(f);

let min_x = data['nodes'][0]['x'];
let max_x = data['nodes'][0]['x'];
let min_y = data['nodes'][0]['y'];
let max_y = data['nodes'][0]['y'];

for (const node of data['nodes']) {
    const x = node['x'] as number;
    const y = node['y'] as number;
    if (min_x > x) min_x = x;
    if (max_x < x) max_x = x;
    if (min_y > y) min_y = y;
    if (max_y < y) max_y = y;
}

let max_value = data['values'][0]['value'];
let min_value = data['values'][0]['value'];

for (const value of data['values']) {
    const val = value['value'] as number;
    if (max_value < val) max_value = val;
    if (min_value > val) min_value = val;
}

function normalised(min: number, max: number, value: number) {
    return (value - min) / (max - min);
}

// collect all nodes into a map for easier access
let nodes: Map<number, MeshNode> = new Map();
for (const node of data['nodes']) {
    nodes.set(node['id'], {
        id: node['id'],
        x: normalised(min_x, max_x, node['x']) * 500,
        y: normalised(min_y, max_y, node['y']) * 500,
        elements: []
    });
}

// collect all elements into a map for easier access
let elements: Map<number, MeshElement> = new Map();
for (const element of data['elements']) {
    elements.set(element['id'], {
        id: element['id'],
        nodes: (element['nodes'] as number[]).map(x => nodes.get(x)) as MeshNode[],
        value: 0
    });

    // make cross references for each element to its nodes
    for (const node_id of element['nodes'] as number[]) {
        const node = nodes.get(node_id);
        node?.elements.push(elements.get(element['id'])!);
    }
}

// setting values to each element
for (const value of data['values']) {
    const element = elements.get(value['element_id']);
    element!.value = normalised(min_value, max_value, value['value']);
}

// helper function to get all neighbouring elements, should run in O(n^2)
function get_neighbouring_elements(element: MeshElement): MeshElement[] {
    let neighbours: Map<number, MeshElement> = new Map();
    //* O(n^2)
    for (const node of element.nodes) {
        for (const element of node.elements) neighbours.set(element.id, element);
    }
    return Array.from(neighbours.values());
}

// compare value of element with values of neighbouring elements
function is_local_maxima(element: MeshElement): boolean {
    const current_value = element.value;
    for (const neighbour of get_neighbouring_elements(element)) {
        if (neighbour.value > current_value) return false;
    }
    return true;
}

// iterate over each element and check whether or not it is a local maxima
// local maxima is true when its neighbouring elements have lower values
let results: Array<MeshElement> = [];
for (const element of elements.values()) {
    if (is_local_maxima(element)) {
        results.push(element);
    }
}
const element_ids = results.map(x => x.id);

results.sort((a, b) => b.value - a.value);

console.log(results.map((x) => { return { 'element_id': x.id, 'value': x.value }; }));

var end = new Date().getTime();

console.log(`${start} - ${end}`);

console.log(`Script took ${end - start}ms`);

function get_average_coord(element: MeshElement, use_x: boolean) {
    let res = 0;
    for (const node of element.nodes) {
        res += use_x ? node.x : node.y;
    }
    return res/3;
}

const polygons = Array.from(elements.entries()).map(element => `<polygon points="${element[1].nodes.map(node => `${node.x},${node.y}`).join(' ')}" stroke="#000" stroke-width=".1" fill="${element_ids.includes(element[1].id) ? '#dc143c' : `rgba(0,0,0, ${element[1].value})`}"/>`);

// const texts = Array.from(elements.entries()).map(element => `<text style="font-size: 2px; fill: #fff;" x="${get_average_coord(element[1], true)}" y="${get_average_coord(element[1], false)}">${element[1].value.toFixed(4)}</text>`);
const texts ='';
writeFile(mesh_file.replace('.json', '.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${polygons}${texts}</svg>`, err => { })