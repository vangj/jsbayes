
/**
 * Initializes a conditional probability table.
 * @param {number} numValues Number of values.
 * @returns {number[]} Array of doubles that sum to 1.0.
 */
function initCpt(numValues) {
  const cpt = [];
  let sum = 0;
  for (let i = 0; i < numValues; i++) {
    cpt[i] = Math.random();
    sum += cpt[i];
  }
  for (let i = 0; i < numValues; i++) {
    cpt[i] = cpt[i] / sum;
  }
  return cpt;
}

/**
 * Initializes a CPT with fake and normalized values using recursion.
 * @param {any[]} values Values of variables (array of values).
 * @param {JNode[]} parents Array of nodes that are parents of the variable.
 * @param {number} paIndex The current parent index.
 * @returns {any[]} An array of nested arrays representing the CPT.
 */
function initCptWithParents(values, parents, paIndex) {
  if (parents && parents.length > 0) {
    const cpts = [];
    if (parents.length === 1 || paIndex === parents.length - 1) {
      const idx = parents.length === 1 ? 0 : paIndex;
      const numPaVals = parents[idx].values.length;
      for (let i = 0; i < numPaVals; i++) {
        const cpt = initCpt(values.length);
        cpts.push(cpt);
      }
    } else {
      const numPaVals = parents[paIndex].values.length;
      for (let i = 0; i < numPaVals; i++) {
        const cpt = initCptWithParents(values, parents, paIndex+1);
        cpts.push(cpt);
      }
    }
    return cpts;
  } else {
    return initCpt(values.length);
  }
}

/**
 * Checks if an object is an array.
 * @param {*} o Object.
 * @returns {boolean} A boolean to indicate if the object is an array object.
 */
function isArray(o) {
  return (o.constructor === Array);
}

/**
 * Checks if an object is an array of arrays.
 * @param {*} o Object.
 * @returns {boolean} A boolean to indicate if the object is array of arrays.
 */
function isArrayOfArray(o) {
  if (isArray(o)) {
    if (o.length > 0) {
      if (isArray(o[0])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Sets the CPT entries to the specified probabilities.
 * @param {any[]} cpt Array of nested arrays representing a CPT.
 * @param {number[][]} probs Array of arrays of probabilities representing a CPT.
 * @param {number} index The current index.
 * @returns {number} The next index.
 */
function setNodeCptProbs(cpt, probs, index) {
  if (!isArrayOfArray(cpt)) {
    for (let i = 0; i < cpt.length; i++) {
      cpt[i] = probs[index][i];
    }
    const nextIndex = index + 1;
    return nextIndex;
  } else {
    let next = index;
    for (let i = 0; i < cpt.length; i++) {
      next = setNodeCptProbs(cpt[i], probs, next);
    }
    return next;
  }
}

/**
 * Initializes a node's CPT.
 * @param {any[]} values Array of values.
 * @param {JNode[]} parents Array of parents.
 * @param {number[][]} probs Array of arrays of probabilities.
 * @returns {any[]} Array of nested arrays representing a CPT.
 */
function initNodeCpt(values, parents, probs) {
  const cpt = initCptWithParents(values, parents, 0);
  setNodeCptProbs(cpt, probs, 0);
  return cpt;
}

/**
 * Normalizes an array of values such that the elements sum to 1.0. Note that
 * 0.001 is added to every value to avoid 0.0 probabilities. This adjustment
 * helps with visualization downstream.
 * @param {number[]} arr Array of probabilities.
 * @returns {number[]} Normalized probailities.
 */
function normalizeProbs(arr) {
  const probs = [];
  let sum = 0.0;
  for (let i = 0; i < arr.length; i++) {
    probs[i] = arr[i] + 0.001;
    sum += probs[i];
  }
  for (let i = 0; i < arr.length; i++) {
    probs[i] = probs[i] / sum;
  }
  return probs;
}

/**
 * Normalizes a CPT.
 * @param {number[][]} cpts Array of arrays (matrix) representing a CPT.
 * @returns {number[][]} Normalized CPT.
 */
function normalizeCpts(cpts) {
  const probs = [];
  for (let i = 0; i < cpts.length; i++) {
    probs.push(normalizeProbs(cpts[i]));
  }
  return probs;
}

export class JNode {

  /**
   * @param {string} name 
   * @param {any[]} values 
   */
  constructor(name, values) {
    /** @type {string} */
    this.name = name;
    /** @type {any[]} */
    this.values = values;
    /** @type {number} */
    this.value = -1;
    /** @type {JNode[]} */
    this.parents = [];
    /** @type {boolean} */
    this.wasSampled = false;
    /** @type {number[] | undefined} */
    this._sampledLw = undefined;
    /** @type {boolean} */
    this.dirty = false;
    /** @type {boolean} */
    this.isObserved = false;
    /** @type {any[]} */
    this.cpt = [];
  }

  /**
     @param {JNode} parent
     @returns {JNode}
   */
  addParent(parent) {
    this.parents.push(parent);
    this.dirty = true;
    return this;
  }

  /**
   * @param {*} v 
   * @returns {number} 
   */
  valueIndex(v) {
    if (!this.valueIndexMap) {
      this.valueIndexMap = {};
      for (let i = 0; i < this.values.length; i++) {
        const value = this.values[i];
        this.valueIndexMap[value] = i;
      }
    }
    return this.valueIndexMap[v];
  }

  /**
   * @param {*} value 
   */
  observe(value) {
    const index = this.valueIndex(value);
    if (index >= 0) {
      this.isObserved = true;
      this.value = index;
    } else {
      console.error('could not find value ' + value + ' for node ' + name);
    }
  }

  unobserve() {
    this.isObserved = false;
    this.value = -1;
  }

  initSampleLw() {
    this._sampledLw = undefined;
  }

  /**
   * @returns {number}
   */
  sampleLw() {
    if (this.wasSampled) {
      return 1;
    }

    let fa = 1;
    this.parents.forEach(pa => {
      fa *= pa.sampleLw();
    });

    this.wasSampled = true;

    let dh = this.cpt;
    this.parents.forEach(pa => {
      dh = dh[pa.value];
    });

    if (this.value != -1) {
      fa *= dh[this.value];
    } else {
      let fv = Math.random();
      for (let h = 0; h < dh.length; h++) {
        fv -= dh[h];
        if (fv < 0) {
          this.value = h;
          break;
        }
      }
    }

    return fa;
  }

  /**
   * @param {number} f 
   */
  saveSampleLw(f) {
    if (!this._sampledLw) {
      this._sampledLw = new Array(this.values.length);
      for (let h = this.values.length - 1; h >= 0; h--) {
        this._sampledLw[h] = 0;
      }
    }
    this._sampledLw[this.value] += f;
  }

  /**
   * @param {number[] | number[][]} probs 
   */
  setCpt(probs) {
    if (this.parents.length === 0) {
      this.cpt =  normalizeProbs(/** @type {number[]} */ (probs));
    } else {
      this.cpt = initNodeCpt(this.values, this.parents, 
        normalizeCpts(/** @type {number[][]} */ (probs)));
    }
  }

  /**
   * @returns {number[]}
   */
  probs() {
    if (!this._sampledLw) {
      return [];
    }
    const sum = this._sampledLw.reduce((acc, s) => acc + s, 0);
    return this._sampledLw.map(s => s/sum);
  }
}


export class JGraph {

  constructor() {
    /** @type {JNode[]} */
    this.nodes = [];
    /** @type {boolean} */
    this.saveSamples = false;
    this.samples = [];
  }

  async reinit() {
    this.nodes.forEach(n => {
      if (n.dirty === undefined || n.dirty) {
        n.cpt = initCptWithParents(n.values, n.parents, 0);
        n.dirty = false;
      }
    });
  }

  /**
   * @param {*} samples 
   * @returns {Promise<number>}
   */
  async sample(samples) {
    if (this.saveSamples) {
      // reset the samples if we want to save them
      this.samples = [];
    }

    for (let h = this.nodes.length-1; h >= 0; h--) {
      this.nodes[h].initSampleLw();
    }

    let lwSum = 0;
    for (let count = 0; count < samples; count++) {
      for (let h = this.nodes.length - 1; h >= 0; h--) {
        const n = this.nodes[h];
        if (!n.isObserved) {
          n.value = -1;
        }
        n.wasSampled = false;
      }

      const fa = this.nodes.reduceRight((prod, n) => prod*n.sampleLw(), 1);
      lwSum += fa;
      for (let h = this.nodes.length - 1; h >= 0; h--) {
        const n = this.nodes[h];
        n.saveSampleLw(fa);
      }

      if (this.saveSamples) {
        const sample = {};
        for (let h = this.nodes.length - 1; h >= 0; h--) {
          const n = this.nodes[h];
          sample[n.name] = n.values[n.value];
        }
        this.samples.push(sample);
      }
    }

    return lwSum;
  }

  update(m) {
    for (let i = 0; i < this.nodes.length; i++) {
      const tnode = this.nodes[i]; //'this' node
      const unode = m[tnode.name]; //update node

      if (!unode) {
        continue;
      }

      tnode.value = unode.value;
      tnode.wasSampled = unode.wasSampled;
      tnode._sampledLw = unode._sampledLw;
    }
  }

  /**
   * @param {string} name 
   * @returns {JNode}
   */
  node(name) {
    if (!this.nodeMap) {
      this.nodeMap = {};
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        this.nodeMap[node.name] = node;
      }
    }
    return this.nodeMap[name];
  }

  /**
   * @param {string} name 
   * @param {*} value 
   */
  observe(name, value) {
    const node = this.node(name);
    if (node) {
      node.observe(value);
    } else {
      console.error('could not find node with name ' + name);
    }
  }

  /**
   * @param {string} name 
   */
  unobserve(name) {
    const node = this.node(name);
    if (node) {
      node.unobserve();
    }
  }

  /**
   * @param {string} name 
   * @param {any[]} values 
   * @returns {JNode}
   */
  addNode(name, values) {
    const node = new JNode(name, values);
    this.nodes.push(node);
    return node;
  }

  samplesAsCsv(options) {
    const opts = options || {};
    const D_ROW = opts.rowDelimiter || '\n';
    const D_FIELD = opts.fieldDelimiter || ',';
    let csv = '';
    let row  = '';
    for (let i = 0; i < this.nodes.length; i++) {
      row += this.nodes[i].name;
      if (i < this.nodes.length-1) {
        row += D_FIELD;
      }
    }
    csv += row + D_ROW;

    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i];
      row = '';
      for (let j = 0; j < this.nodes.length; j++) {
        const node = this.nodes[j];
        row += sample[node.name];
        if (j < this.nodes.length-1) {
          row += D_FIELD;
        }
      }
      csv += row;
      if (i < this.samples.length-1) {
        csv += D_ROW;
      }
    }

    return csv;
  }

}

export function toMessage(g) {
  const nodes = {};
  const parents = {};

  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    const node = {
      name: n.name,
      values: n.values,
      value: n.value,
      parents: [],
      wasSampled: n.wasSampled,
      sampledLw: n._sampledLw,
      cpt: n.cpt
    };
    nodes[n.name] = node;

    const pas = [];
    for (let j = 0; j < n.parents.length; j++) {
      const pa = n.parents[j];
      pas.push(pa.name);
    }
    parents[n.name] = pas;
  }

  const msg = {
    samples: 10000,
    nodes: nodes,
    parents: parents
  };

  return JSON.stringify(msg);
}
