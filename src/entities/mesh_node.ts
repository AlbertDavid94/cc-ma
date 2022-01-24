import { MeshElement } from './mesh_element';

export type MeshNode = {
    id: number;
    x: number;
    y: number;
    elements: MeshElement[];
}