
import {JGraph} from '../dist/jsbayes.esm.js';


window.addEventListener('load', () => new integrationTest());

export class integrationTest {

  constructor() {
    this._init();
  }

  /**
   * Initializes the integration test.
   * @private
   */
  async _init() {
    const g = new JGraph();
    const nodeNames = [
      'storm', 'lightning', 'thunder', 'campfire',
      'forest-fire', 'bus-tour-group'];
    for (const name of nodeNames) {
      g.addNode(name, ['true', 'false']);
      const obs = document.getElementById(`${name}-obs-cbox`);
      const val = document.getElementById(`${name}-val-cbox`);
      val.disabled = true;
      obs.addEventListener('change', async () => {
        if (obs.checked) {
          g.observe(name, val.checked ? 'true' : 'false');
          val.disabled = false;
        } else {
          g.unobserve(name);
          val.disabled = true;
        }
        await g.sample(10000);
        this._updateProbs(g);
      });
      val.addEventListener('change', async () => {
        g.observe(name, val.checked ? 'true' : 'false');
        await g.sample(10000);
        this._updateProbs(g);
      });
    }

    g.node('lightning').addParent(g.node('storm'));
    g.node('forest-fire').addParent(g.node('storm'));
    g.node('campfire').addParent(g.node('storm'));
    g.node('campfire').addParent(g.node('bus-tour-group'));
    g.node('thunder').addParent(g.node('lightning'));
    g.node('forest-fire').addParent(g.node('lightning'));
    g.node('forest-fire').addParent(g.node('campfire'));

    g.node('storm').cpt = [0.2, 0.8];
    g.node('bus-tour-group').cpt = [0.5, 0.5];
    g.node('lightning').cpt = [
      [0.9, 0.1],      // p(l=1|s=1), p(l=0|s=1)
      [0.01, 0.99]     // p(l=1|s=0), p(l=0|s=0)
    ];
    g.node('thunder').cpt = [
      [0.95, 0.05],    // p(t=1|l=1), p(t=0|l=1)
      [0.1, 0.9]       // p(t=1|l=0), p(t=0|l=0)
    ];
    g.node('campfire').cpt = [   // storm
      [                // busTourGroup
        [0.01, 0.99],  // p(c=1|s=1,b=1), p(c=0|s=1,b=1)
        [0, 1]         // p(c=1|s=1,b=0), p(c=0|s=1,b=0)
      ],
      [                // busTourGroup
        [0.99, 0.01],  // p(c=1|s=0,b=1), p(c=0|s=0,b=1)
        [0, 1]         // p(c=1|s=0,b=0), p(c=0|s=0,b=0)
      ]
    ];
    g.node('forest-fire').cpt = [ // storm
      [                // lightning
        [              // campfire
          [0.75, 0.25],// p(f=1|s=1,l=1,c=1), p(f=0|s=1,l=1,c=1)
          [0.5, 0.5]   // p(f=1|s=1,l=1,c=0), p(f=0|s=1,l=1,c=0)
        ],
        [              // campfire
          [0.6, 0.4],  // p(f=1|s=1,l=0,c=1), p(f=0|s=1,l=0,c=1)
          [0.2, 0.8]   // p(f=1|s=1,l=0,c=0), p(f=0|s=1,l=0,c=0)
        ]
      ],
      [                // lightning
        [              // campfire
          [0.7, 0.3],  // p(f=1|s=0,l=1,c=1), p(f=0|s=0,l=1,c=1)
          [0.4, 0.6]   // p(f=1|s=0,l=1,c=0), p(f=0|s=0,l=1,c=0)
        ],
        [              // campfire
          [0.3, 0.7],  // p(f=1|s=0,l=0,c=1), p(f=0|s=0,l=0,c=1)
          [0.01, 0.99] // p(f=1|s=0,l=0,c=0), p(f=0|s=0,l=0,c=0)
        ]
      ]
    ];

    this._format = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
    await g.sample(10000); //likelihood weight sampling aka the inference
    this._updateProbs(g);
  }

  _updateProbs(g) {
    for (const node of g.nodes) {
      const spans = [
        document.getElementById(`${node.name}-t`),
        document.getElementById(`${node.name}-f`)];
      node.probs().map((p, i) => {
        spans[i].textContent = this._format.format(p);
      });
    }
  }

}
