import test from 'ava';

import { JGraph } from './src/main.js';

test('new graph has no nodes', t => {
  const g = new JGraph();
  const want = 0;
  const got = g.nodes.length;
  t.is(got, want, `got ${got}, want ${want}`);
});

test('graph verifies nodes added', t => {
  const g = new JGraph();
  g.addNode('n1', ['t', 'f']);
  g.addNode('n2', ['t', 'f']);
  g.addNode('n3', ['t', 'f']);
  const got = g.nodes.length;
  const want = 3;
  t.is(got, want, `got ${got}, want ${want}`);
});

test('graph verifies parent nodes added', t => {
  const g = new JGraph();
  const n1 = g.addNode('n1', ['t', 'f']);
  const n2 = g.addNode('n2', ['t', 'f']);
  const n3 = g.addNode('n3', ['t', 'f']);
  n2.addParent(n1);
  n3.addParent(n1).addParent(n2);
  t.is(n1.parents.length, 0);
  t.is(n2.parents.length, 1);
  t.is(n3.parents.length, 2);
});
