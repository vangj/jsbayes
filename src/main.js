'use strict';

/**
 * Initializes a conditional probability table.
 * @param {Number} numValues Number of values.
 * @returns {Array} Array of doubles that sum to 1.0.
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
 * @param {Array} values Values of variables (array of values).
 * @param {Array} parents Array of JSON nodes that are parents of the variable.
 * @param {Number} paIndex The current parent index.
 * @returns {Array} An array of nested arrays representing the CPT.
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
 * @returns {Boolean} A boolean to indicate if the object is an array object.
 */
function isArray(o) {
  return (o.constructor === Array);
}

/**
 * Checks if an object is an array of arrays.
 * @param {*} o Object.
 * @returns {Boolean} A boolean to indicate if the object is array of arrays.
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
 * @param {Array} cpt Array of nested arrays representing a CPT.
 * @param {Array} probs Array of arrays of probabilities representing a CPT.
 * @param {Number} index The current index.
 * @returns {Number} The next index.
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
 * @param {Array} values Array of values.
 * @param {Array} parents Array of parents.
 * @param {Array} probs Array of arrays of probabilities.
 * @returns {Array} Array of nested arrays representing a CPT.
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
 * @param {Array} arr Array of probabilities.
 * @returns {Array} Normalized probailities.
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
 * @param {Array} cpts Array of arrays (matrix) representing a CPT.
 * @returns {Array} Normalized CPT.
 */
function normalizeCpts(cpts) {
  const probs = [];
  for (let i = 0; i < cpts.length; i++) {
    probs.push(normalizeProbs(cpts[i]));
  }
  return probs;
}

class JNode {

  constructor(name, values) {
    this.name = name;
    this.values = values;
    this.value = -1;
    this.parents = [];
    this.wasSampled = false;
    this._sampledLw = undefined;
  }

  /**
     @param {JNode} parent
   */
  addParent(parent) {
    this.parents.push(parent);
    this.dirty = true;
    return this;
  }

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

  initSampleLw() {
    this._sampledLw = undefined;
  }

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

  saveSampleLw(f) {
    if (!this._sampledLw) {
      this._sampledLw = new Array(this.values.length);
      for (let h = this.values.length - 1; h >= 0; h--) {
        this._sampledLw[h] = 0;
      }
    }
    this._sampledLw[this.value] += f;
  }

  setCpt(probs) {
    if (this.parents.length === 0) {
      this.cpt = normalizeProbs(probs);
    } else {
      this.cpt = initNodeCpt(this.values, this.parents, normalizeCpts(probs));
    }
  }

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
    this.nodes = [];
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
      tnode.sampledLw = unode.sampledLw;
    }
  }

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

  observe(name, value) {
    const node = this.node(name);
    if (node) {
      const index = node.valueIndex(value);
      if (index >= 0) {
        node.isObserved = true;
        node.value = index;
      } else {
        console.error('could not find value ' + value + ' for node ' + name);
      }
    } else {
      console.error('could not find node with name ' + name);
    }
  }

  unobserve(name) {
    const node = this.node(name);
    if (node) {
      node.isObserved = false;
      node.value = -1;
    }
  }

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
