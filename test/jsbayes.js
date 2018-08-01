var should = require('chai').should()
    expect = require('chai').expect;
var jsbayes = require('../jsbayes');

describe('#graph', function() {
  it('verifies no node', function() {
    var g = jsbayes.newGraph();
    expect(g.nodes.length).to.equal(0);
  });

  it('verifies nodes added', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);
    expect(g.nodes.length).to.equal(3);
  });

  it('verifies parent nodes added', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n1).addParent(n2);

    expect(n1.parents.length).to.equal(0);
    expect(n2.parents.length).to.equal(1);
    expect(n3.parents.length).to.equal(2);
  });

  it('verifies binary cpt initialization', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n1).addParent(n2);

    g.reinit();

    expect(n1.cpt.length).to.equal(2);

    expect(n2.cpt.length).to.equal(2);
    expect(n2.cpt[0].length).to.equal(2);
    expect(n2.cpt[1].length).to.equal(2);

    expect(n3.cpt.length).to.equal(2);
    expect(n3.cpt[0].length).to.equal(2);
    expect(n3.cpt[0][0].length).to.equal(2);
    expect(n3.cpt[0][1].length).to.equal(2);
    expect(n3.cpt[1].length).to.equal(2);
    expect(n3.cpt[1][0].length).to.equal(2);
    expect(n3.cpt[1][1].length).to.equal(2);
  });

  it('verifies non-binary cpt initialization', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['a', 'b', 'c']);
    var n2 = g.addNode('n2', ['a', 'b']);
    var n3 = g.addNode('n3', ['a', 'b', 'c']);

    n2.addParent(n1);
    n3.addParent(n2);

    g.reinit();

    expect(n1.cpt.length).to.equals(3);

    expect(n2.cpt.length).to.equals(3);
    expect(n2.cpt[0].length).to.equals(2);
    expect(n2.cpt[1].length).to.equals(2);
    expect(n2.cpt[2].length).to.equals(2);

    expect(n3.cpt.length).to.equals(2);
    expect(n3.cpt[0].length).to.equals(3);
    expect(n3.cpt[1].length).to.equals(3);
  });

  it('verfies sampling', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.cpt = [ 0.5, 0.5 ];
    n2.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];
    n3.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];

    var r = g.sample(10000)
    .then(function(r) {
      expect(r).to.equals(10000);

      expect(n1.sampledLw.length).to.equal(2);
      var s1 = n1.sampledLw[0];
      var s2 = n1.sampledLw[1];
      var v1 = s1 / (s1 + s2);
      var v2 = s2 / (s1 + s2);
      expect(v1).to.be.within(0.49, 0.51);
      expect(v2).to.be.within(0.49, 0.51);

      expect(n2.sampledLw.length).to.equal(2);
      s1 = n2.sampledLw[0];
      s2 = n2.sampledLw[1];
      v1 = s1 / (s1 + s2);
      v2 = s2 / (s1 + s2);
      expect(v1).to.be.within(0.49, 0.51);
      expect(v2).to.be.within(0.49, 0.51);

      expect(n3.sampledLw.length).to.equal(2);
      s1 = n3.sampledLw[0];
      s2 = n3.sampledLw[1];
      v1 = s1 / (s1 + s2);
      v2 = s2 / (s1 + s2);
      expect(v1).to.be.within(0.49, 0.51);
      expect(v2).to.be.within(0.49, 0.51);
    })
    .catch(function(e) {
      assert(true == false, 'Exception occurred: ' + e);
    });
  });
  
  it('verifies sampling with observation', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.cpt = [ 0.5, 0.5 ];
    n2.cpt = [ [ 0.2, 0.8 ], [ 0.5, 0.5 ] ];
    n3.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];
    n1.value = 0;
    n1.isObserved = true;
    g.sample(10000);
    
    var probs = n1.probs();
    var p1 = probs[0];
    var p2 = probs[1];
    expect(p1).to.be.within(0.99, 1.0);
    expect(p2).to.be.within(0.0, 0.0);
    
    probs = n2.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.19,0.21);
    expect(p2).to.be.within(0.79,0.81);
    
    probs = n3.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.51);
    expect(p2).to.be.within(0.49,0.51);
    
    n1.isObserved = false;
    g.sample(10000);
    
    probs = n1.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.51);
    expect(p2).to.be.within(0.49,0.51);
    
    probs = n2.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.34,0.36);
    expect(p2).to.be.within(0.64,0.66);
    
    probs = n3.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.51);
    expect(p2).to.be.within(0.49,0.51);
  });
  
  it('verifies sampling with observation alternative method', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.cpt = [ 0.5, 0.5 ];
    n2.cpt = [ [ 0.2, 0.8 ], [ 0.5, 0.5 ] ];
    n3.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];
    
    g.observe('n1', 't');
    g.sample(10000);
    
    var probs = n1.probs();
    var p1 = probs[0];
    var p2 = probs[1];
    expect(p1).to.be.within(0.99, 1.0);
    expect(p2).to.be.within(0.0, 0.0);
    
    probs = n2.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.19,0.21);
    expect(p2).to.be.within(0.79,0.81);
    
    probs = n3.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.51);
    expect(p2).to.be.within(0.49,0.51);
    
    g.unobserve('n1');
    g.sample(10000);
    
    probs = n1.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.52);
    expect(p2).to.be.within(0.49,0.52);
    
    probs = n2.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.34,0.36);
    expect(p2).to.be.within(0.64,0.66);
    
    probs = n3.probs();
    p1 = probs[0];
    p2 = probs[1];
    expect(p1).to.be.within(0.49,0.51);
    expect(p2).to.be.within(0.49,0.51);
  });
  
  it('verifies samples are saved when requested', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.cpt = [ 0.5, 0.5 ];
    n2.cpt = [ [ 0.2, 0.8 ], [ 0.5, 0.5 ] ];
    n3.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];
    
    g.observe('n1', 't');
    g.sample(10000);
    
    expect(g.samples.length).to.equals(0);
    
    g.saveSamples = true;
    g.sample(1000);
    
    expect(g.samples.length).to.equals(1000);
    
    g.sample(1000);
    //samples should not increase but be resetted and readded
    expect(g.samples.length).to.equals(1000);
    
    g.sample(500);
    //samples should not increase but be resetted and readded
    expect(g.samples.length).to.equals(500);
  });
  
  it('verifies samples are converted to csv', function() {
    var g = jsbayes.newGraph();
    g.saveSamples = true;
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.cpt = [ 0.5, 0.5 ];
    n2.cpt = [ [ 0.2, 0.8 ], [ 0.5, 0.5 ] ];
    n3.cpt = [ [ 0.5, 0.5 ], [ 0.5, 0.5 ] ];
    
    g.sample(10);
    var csv = g.samplesAsCsv();
    
    var rows = csv.split('\n');
    expect(rows.length).to.equals(11);
    
    for(var i=0; i < rows.length; i++) {
      var cols = rows[i].split(',');
      expect(cols.length).to.equals(3);
    }
  })
});

describe('#nodes', function() {
  it('verifies get node by id', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    var n = g.node('n1');
    expect(n.name).to.equals('n1');

    n = g.node('n2');
    expect(n.name).to.equals('n2');

    n = g.node('n3');
    expect(n.name).to.equals('n3');
  });

  it('verifies get index of values', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['t', 'f']);
    var n2 = g.addNode('n2', ['t', 'f']);
    var n3 = g.addNode('n3', ['f', 't']); //swapped

    var i1 = n1.valueIndex('t');
    var i2 = n1.valueIndex('f');
    expect(i1).to.equals(0);
    expect(i2).to.equals(1);

    i1 = n2.valueIndex('t');
    i2 = n2.valueIndex('f');
    expect(i1).to.equals(0);
    expect(i2).to.equals(1);

    i1 = n3.valueIndex('t');
    i2 = n3.valueIndex('f');
    expect(i1).to.equals(1);
    expect(i2).to.equals(0);
  });

  it('verifies set cpt one parent', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['0', '1']);
    var n2 = g.addNode('n2', ['0', '1']);
    var n3 = g.addNode('n3', ['0', '1', '2']);

    n2.addParent(n1);
    n3.addParent(n2);

    n1.setCpt([ 0.5, 0.5 ]);
    n2.setCpt([
      [ 0.5, 0.5 ],
      [ 0.2, 0.8 ]
    ]);
    n3.setCpt([
      [ 0.3000997008973081, 0.5992023928215354, 0.10069790628115655 ],
      [ 0.10069790628115653, 0.30009970089730803, 0.5992023928215353 ]
    ]);

    expect(n1.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n2.cpt).to.deep.equal([ [ 0.5, 0.5 ], [ 0.20059880239520958, 0.7994011976047904 ] ]);
    expect(n3.cpt).to.deep.equal([ 
      [ 0.3001991035865484, 0.5984071713076126, 0.10139372510583902 ], 
      [ 0.10139372510583902, 0.30019910358654844, 0.5984071713076126 ] ]);
  });

  it('verifies set cpt two parents', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['0', '1']);
    var n2 = g.addNode('n2', ['0', '1']);
    var n3 = g.addNode('n3', ['0', '1']);

    n3.addParent(n1);
    n3.addParent(n2);

    n1.setCpt([ 0.5, 0.5 ]);
    n2.setCpt([ 0.5, 0.5 ]);
    n3.setCpt([
      [ 0.9, 0.1 ],
      [ 0.8, 0.2 ],
      [ 0.7, 0.3 ],
      [ 0.6, 0.4 ]
    ]);

    expect(n1.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n2.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n3.cpt).to.deep.equal([ 
      [ [ 0.8992015968063872, 0.10079840319361279 ], [ 0.7994011976047904, 0.20059880239520958 ] ],
      [ [ 0.6996007984031936, 0.3003992015968064 ], [ 0.5998003992015968, 0.4001996007984032 ] ] 
    ]);
  });

  it('verifies set cpt three parents', function() {
    var g = jsbayes.newGraph();
    var n1 = g.addNode('n1', ['0', '1']);
    var n2 = g.addNode('n2', ['0', '1']);
    var n3 = g.addNode('n3', ['0', '1']);
    var n4 = g.addNode('n4', ['0', '1']);

    n4.addParent(n1);
    n4.addParent(n2);
    n4.addParent(n3);

    n1.setCpt([ 0.5, 0.5 ]);
    n2.setCpt([ 0.5, 0.5 ]);
    n3.setCpt([ 0.5, 0.5 ]);
    n4.setCpt([
      [ 0.9, 0.1 ],
      [ 0.8, 0.2 ],
      [ 0.7, 0.3 ],
      [ 0.6, 0.4 ],
      [ 0.5, 0.5 ],
      [ 0.4, 0.6 ],
      [ 0.3, 0.7 ],
      [ 0.2, 0.8 ]
    ]);

    expect(n1.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n2.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n3.cpt).to.deep.equal([ 0.5, 0.5 ]);
    expect(n4.cpt).to.deep.equal(
      [//n1
        [//n1=0
          [//n2=0
            [//n3=0
              0.8992015968063872, 0.10079840319361279
            ],
            [//n3=1
              0.7994011976047904, 0.20059880239520958
            ]
          ],
          [//n2=1
            [//n3=0
              0.6996007984031936, 0.3003992015968064
            ],
            [//n3=1
              0.5998003992015968, 0.4001996007984032
            ]
          ]
        ],
        [//n1=1
          [//n2=0
            [//n3=0
              0.5,0.5
            ],
            [//n3=1
              0.4001996007984032, 0.5998003992015968
            ]
          ],
          [//n2=1
            [//n3=0
              0.3003992015968064, 0.6996007984031936
            ],
            [//n3=1
              0.20059880239520958, 0.7994011976047904
            ]
          ]
        ]
      ]
    );
  });
});

