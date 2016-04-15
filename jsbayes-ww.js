function toGraph(obj) {
  var nodes = obj.nodes;
  var parents = obj.parents;
  
  var arrNodes = [];
  for(var name in parents) {
    var node = nodes[name];
    var pas = parents[name];
    for(var i=0; i < pas.length; i++) {
      var pa = nodes[pas[i]];
      node.parents.push(pa);
    }
    arrNodes.push(node);
    
    node.initSampleLw = function() {
      this.sampledLw = undefined;
    };
    node.sampleLw = function() {
      if(this.wasSampled) {
        return 1;
      }

      var fa = 1;
      for(var h=0; h < this.parents.length; h++) {
        var pa = this.parents[h];
        var pSampleLw = pa.sampleLw();
        fa *= pSampleLw;
      }

      this.wasSampled = true;

      var dh = this.cpt;
      for(var h=0; h < this.parents.length; h++) {
        var p = this.parents[h];
        var v = p.value;
        dh = dh[v];
      }

      if(this.value != -1) {
        var v = dh[this.value];
        fa *= v;
      } else {
        var fv = Math.random();
        for(var h=0; h < dh.length; h++) {
          var v = dh[h];
          fv -= v;
          if(fv < 0) {
            this.value = h;
            break;
          }
        }
      }

      return fa;
    };
    node.saveSampleLw = function(f) {
      if(!this.sampledLw) {
        this.sampledLw = new Array(this.values.length);
        for(var h=this.values.length-1; h >= 0; h--) {
          this.sampledLw[h] = 0;
        }
      }
      this.sampledLw[this.value] += f;
    };
  }
  
  var g = {
    nodes: arrNodes,
    sample: function(samples) {
      var g = this;
      for(var h=g.nodes.length-1; h >= 0; h--) {
        g.nodes[h].initSampleLw();
      }

      var lwSum = 0;
      for(var count=0; count < samples; count++) {
        for(var h=g.nodes.length-1; h >= 0; h--) {
          var n = g.nodes[h];
          if(!n.isObserved) {
            n.value = -1;
          }
          n.wasSampled = false;
        }

        var fa = 1;
        for(var h=g.nodes.length-1; h >= 0; h--) {
          var n = g.nodes[h];
          fa *= n.sampleLw();
        }
        lwSum += fa;
        for(var h=g.nodes.length-1; h >= 0; h--) {
          var n = g.nodes[h];
          n.saveSampleLw(fa);
        }
      }

      return lwSum;
    }
  }
    
  return g;
}

function sample(msg) {
  var obj= JSON.parse(msg);
  var samples = obj.samples;
  var g = toGraph(obj);
  g.sample(samples);
  
  var nodes = {};
  for(var i=0; i < g.nodes.length; i++) {
    var node = g.nodes[i];
    nodes[node.name] = node;
  }
  
  var response = {
    success: true,
    nodes: nodes
  };
  self.postMessage(JSON.stringify(response));
}

self.onmessage = function(e) {
  sample(e.data);
}