export function toMessage(g: any): string;
export class JNode {
    constructor(name: string, values: any[]);
    name: string;
    values: any[];
    value: number;
    parents: JNode[];
    wasSampled: boolean;
    _sampledLw: number[] | undefined;
    dirty: boolean;
    isObserved: boolean;
    cpt: any[];
    addParent(parent: JNode): JNode;
    valueIndex(v: any): number;
    valueIndexMap: {};
    observe(value: any): void;
    unobserve(): void;
    initSampleLw(): void;
    sampleLw(): number;
    saveSampleLw(f: number): void;
    setCpt(probs: number[] | number[][]): void;
    probs(): number[];
}
export class JGraph {
    nodes: JNode[];
    saveSamples: boolean;
    samples: any[];
    reinit(): Promise<void>;
    sample(samples: any): Promise<number>;
    update(m: any): void;
    node(name: string): JNode;
    nodeMap: {};
    observe(name: string, value: any): void;
    unobserve(name: string): void;
    addNode(name: string, values: any[]): JNode;
    samplesAsCsv(options: any): string;
}
