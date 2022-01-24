import { MeshNode } from './mesh_node'

export type MeshElement = {
    id: number;
    value: number;
    nodes: MeshNode[];
}