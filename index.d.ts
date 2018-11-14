interface CsvOptions {
  rowDelimiter: string;
  fieldDelimiter: string;
}
interface JNode {
  name: string;
  values: Array<string>;
  cpt: number[][] | number[];
  sampledLw: Array<number>;
  addParent(parent: JNode): JNode;
  setCpt(probs: number[][] | number[]): void;
  probs(): Array<number>;
}
interface JGraph {
  saveSamples: boolean;
  nodes: Array<JNode>;
  addNode(name: string, values: Array<string>): JNode;
  reinit(): Promise<any>;
  sample(samples: number): Promise<any>;
  observe(name: string, value: string): void;
  unobserve(name: string): void;
  samplesAsCsv(options: CsvOptions | any): string;
}
interface JsBayes {
  newGraph(): JGraph;
}
declare module "jsbayes" {
  let jsbayes: JsBayes;
  export = jsbayes;
}