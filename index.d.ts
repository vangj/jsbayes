interface CsvOptions {
  rowDelimiter: string;
  fieldDelimiter: string;
}
interface Node {
  name: string;
  values: Array<string>;
  cpt: number[][] | number[];
  addParent(parent: Node): Node;
  setCpt(probs: number[][] | number[]): void;
  probs(): Array<number>;
}
interface Graph {
  saveSamples: boolean;
  nodes: Array<Node>;
  addNode(name: string, values: Array<string>): Node;
  reinit(): Promise<any>;
  sample(samples: number): Promise<any>;
  observe(name: string, value: string): void;
  unobserve(name: string): void;
  samplesAsCsv(options: CsvOptions): string;
}
interface JsBayes {
  newGraph(): Graph;
}
declare module "jsbayes" {
  let jsbayes: JsBayes;
  export = jsbayes;
}