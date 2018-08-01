jsbayes
=======
This JavaScript library is a Bayesian Belief Network (BBN) inference tool using likelihood weight sampling. It is somewhat of a copy/paste job from the original source [bayes.js](https://github.com/Pl4n3/bayes.js). The original code has been revised with the following enhancements.

 - add utility methods for convenience
 - able to be used client-side (bower) or server-side (npm)
 - use WebWorker for computationally expensive sampling

# How do I use jsbayes?
You may use jsbayes on the client-side (e.g. Chrome) or server-side (e.g. NodeJS). On the client-side, simply include a reference to the source file.

`<script type="text/javascript" src="jsbayes.js"></script>`

On the server-side, use `npm` to install.

`npm install jsbayes --save`

Then you can import the library with `var jsbayes = require('jsbayes');`

As a quickstart, here's how you create a BBN using the library.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['true', 'false']);
var n2 = g.addNode('n2', ['true', 'false']);
var n3 = g.addNode('n3', ['true', 'false']);

n2.addParent(n1);
n3.addParent(n2);
```

Before you can perform inference, you need to define the local probability models; in this case, they are simply conditional probability tables (CPTs). More on defining CPTs later. To get you going fast, you can initialize the CPTs for every node to random values and then perform inference.

```
g.reinit()
.then(function(r) { 
 return g.sample(10000); //likelihood weight sampling aka the inference
})
.then(function(r) {
 //do something like console.log(g);
});
```

The `reinit()` and `sample()` methods each return a `Promise` so you may chain actions.

To programmatically mark a node as observed, do something like the following. Note that you have to sample again.

```
g.observe('n1', 'true');
g.sample(10000);
```

If you want to unobserve a node, do something like the following.

```
g.unobserve('n1');
g.sample(10000);
```

If you want to save the actual samples generated, do the following.

```
g.saveSamples = true;
g.sample(10000);
//your results will be stored in g.samples
```

# Defining Conditional Probability Tables (CPTs)
The toughest thing you're going to encounter is how to specify CPTs for each node. Expressed in JavaScript, a CPT is an array of arrays of arrays of arrays .... (multi-dimensional arrays). 

For a node `n1` with two values (e.g. true and false), also referred to as a binary node, and no parents, the CPT will look like the following. Notice how the values sum to 1.0?

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['true', 'false']);

n1.cpt = [ 0.6, 0.4 ]; //[ P(n1=true), P(n1=false) ]
```

For a binary node `n2` with one parent `n1` (that is also a binary node), the CPTs will look like the following. Again, note that each array containing float values sum to 1.0 across all float values.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['true', 'false']);
var n2 = g.addNode('n2', ['true', 'false']);
n2.addParent(n1);

n1.cpt = [0.6, 0.4]; // [ P(n1=true), P(n1=false) ]
n2.cpt = [ 
 [0.2, 0.8], //[ P(n2=true|n1=true), P(n2=false|n1=true) ]
 [0.8, 0.2]  //[ P(n2=true|n1=false), P(n2=false|n1=false) ]
];
```

If `n2` had three values, then the CPTs will look like the following. (Since we are moving beyond a node having more than 2 values, let's not use true and false anymore, and use string values of integers). Notice how each array containing floats now has three values and they sum to 1.0.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['0', '1']);
var n2 = g.addNode('n2', ['0', '1', '2']);
n2.addParent(n1);

n1.cpt = [0.6, 0.4];
n2.cpt = [ 
 [0.2, 0.2, 0.6], //[ P(n2=0|n1=0), P(n2=1|n1=0), P(n2=2|n1=0) ]
 [0.6, 0.2, 0.2]  //[ P(n2=0|n1=0), P(n2=1|n1=0), P(n2=2|n1=0) ]
];
```

If `n2` had three values, and its parent `n1` also has three values, then the CPTs will look like the following.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['0', '1', '2']);
var n2 = g.addNode('n2', ['0', '1', '2']);
n2.addParent(n1);

n1.cpt = [0.1, 0.8, 0.1]; //note 3 float values
n2.cpt = [ 
 [0.2, 0.2, 0.6], //[ P(n2=0|n1=0), P(n2=1|n1=0), P(n2=2|n1=0) ]
 [0.6, 0.2, 0.2], //[ P(n2=0|n1=1), P(n2=1|n1=1), P(n2=2|n1=1) ]
 [0.2, 0.6, 0.2]  //[ P(n2=0|n1=2), P(n2=1|n1=2), P(n2=2|n1=2) ]
];
```

Hopefully you are understanding the pattern thus far. Now, let's assume there is a binary node `n3` that has two parents (also binary nodes) `n1` and `n2`. The CPTs will look like the following.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['0', '1']);
var n2 = g.addNode('n2', ['0', '1']);
var n3 = g.addNode('n3', ['0', '1']);

n3.addParent(n1)
 .addParent(n2);

n1.cpt = [0.2, 0.8]; //[ P(n1=0), P(n1=1) ]
n2.cpt = [0.8, 0.2]; //[ P(n2=0), P(n2=1) ]
n3.cpt = [ 
 [ [ 0.2, 0.8 ], [ 0.8, 0.2 ] ],
 [ [ 0.2, 0.8 ], [ 0.8, 0.2 ] ]
];
```

Umm, what just happened here? Let's just take the CPT for `n3` and look at it slowly with comments. You will notice that `n3.cpt` is just an array `[]`. Futhermore, if you stare at it long enough, you will notice that the values inside `n3.cpt` are themselves array `[ [], [] ]`. The outermost array `[]` represents the first parent `n1` and the two elements (that are themselves arrays) correspond to the two values of `n1`.

```
n3.cpt = [ //n1
 [ [ 0.2, 0.8 ], [ 0.8, 0.2 ] ], //when n1=0
 [ [ 0.2, 0.8 ], [ 0.8, 0.2 ] ]  //when n1=1
];
```

Let's keep going. Inside each of the two elements of the outer array (that are themselves arrays) `[ [], [] ]`, there are yet two more arrays! These represent the parent `n2` and its two values. The code is now formatted and commented to help you see the picture.

```
n3.cpt = [ //n1
 [ //n2
  [ 0.2, 0.8 ], //when n2=0
  [ 0.8, 0.2 ]  //when n2=1
 ], //when n1=0
 [ //n2
  [ 0.2, 0.8 ], //when n2=0
  [ 0.8, 0.2 ]  //when n2=1
 ] //when n1=1
];
```

Here again is `n3.cpt` formatted with the conditional probabilities in the comment.

```
n3.cpt = [
 [
  [ 0.2, 0.8 ], //[ P(n3=0|n1=0,n2=0), P(n3=1|n1=0,n2=0) ]
  [ 0.8, 0.2 ]  //[ P(n3=0|n1=0,n2=1), P(n3=1|n1=0,n2=1) ]
 ],
 [
  [ 0.2, 0.8 ], //[ P(n3=0|n1=1,n2=0), P(n3=1|n1=1,n2=0) ]
  [ 0.8, 0.2 ]  //[ P(n3=0|n1=1,n2=1), P(n3=1|n1=1,n2=1) ]
 ]
];
```

Each parent creates an array with the number of elements that is equal to its number of values. 

 - Node with two values creates `[ [], [] ]`
 - Node with three values creates `[ [], [], [] ]`

The elements of the array are also arrays until we get to the last parent, at which point, the number of elements is equal to the number of values of the child.

Needless to say, for a given node with multiple parents, it is going to be *VERY HARD* to define these CPTs. A helper method `setCpt()` can help alleviate creating the CPTs. You may use it as follows.

```
n3.setCpt([
 [ 0.2, 0.8 ],
 [ 0.8, 0.2 ],
 [ 0.2, 0.8 ],
 [ 0.8, 0.2 ]
]);
```
Notice how we have *flattened* the nested arrays? The helper method `setCpt()` will not change the structure of the CPT but will map the array of array (2D matrix) to the required underlying structure. Let's call this *flattened* array of array a *2D matrix* or just matrix for short since you may reference the elements/items by a row-column fashion (e.g. `cpt[0][0]`). Now, let's understand the matrix that we need to pass in with this new helper method. Denote the *cardinality* of a node as the number of values it has; for example, for a binary node, the cardinality is 2 (since it has 2 values). You will always need a matrix with enough elements (conditional probabilities) to equal the product of the node's cardinalities with its parents' cardinalities. 

For example, assume we are only dealing with binary nodes (nodes with 2 values or alternatively, cardinality of 2), and node `n2` is a parent of `n1`, then the number of conditional probabilities we need to specify is 4 since 2 x 2 = 4. Again, assuming only binary nodes and `n2` and `n3` are parents of `n1`, then the number of conditional probabilities we need to specify is 8 since 2 x 2 x 2 = 8. Denote the product of the cardinalities (a node's and its parents' cardinalities) as **P**. 

The dimension of the matrix is determined by the cardinalities of the node and its parents. In particular, the number of columns is equal to the cardinality of the node, and the number of rows is equal to **P** divided by the cardinality of the node. In the example above using `setCpt()` the matrix dimensions are 2 columns by 4 rows. In that example, **P** was 2 x 2 x 2 = 8, and so **P** / 2 = 4. The following is a table that attempts to express the matrix.

 - first row, third column is P(n3=0|n1=0, n2=0) = 0.2 
 - first row, fourth column is P(n3=1|n1=0,n2=0) = 0.8

| n1 | n2 |  0  |  1  |
|----|----|-----|-----|
| 0  | 0  | 0.2 | 0.8 |
| 0  | 1  | 0.8 | 0.2 |
| 1  | 0  | 0.2 | 0.8 |
| 1  | 1  | 0.8 | 0.2 |

# Using WebWorker
If you have a huge BBN, the inference algorithm (likelihood weight sampling) might take a while. You might want to experiment with the WebWorker. Basically, the BBN is serialized and passed to the WebWorker; the WebWorker deserializes the BBN and performs the sampling, after which it serializes the BBN and passes back to your calling script. Below is a code snippet.

```
var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['0','1]);
//add more nodes
//define parents for nodes
g.reinit(); //initialize node

var worker = new Worker('path/to/js/lib/jsbayes-ww.js');
worker.onerror = function(e) {
  console.error(e);
};
worker.onmessage = function(e) {
  console.log(e);
  var obj = JSON.parse(e.data);
  console.log(obj);

  g.update(obj.nodes);
  console.log(g);
};
worker.postMessage(jsbayes.toMessage(g));
  ```

# Unit Testing

To run the unit tests, make sure you have NodeJS and npm installed and type in the following.

```bash
npm install
make
```

# Citation

```
@misc{vang_jsbayes_2016, 
title={jsbayes}, 
url={https://github.com/vangj/jsbayes/}, 
journal={GitHub},
author={Vang, Jee}, 
year={2016}, 
month={Jan}}
```

# Copyright Stuff

```
Copyright 2016 Jee Vang

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```