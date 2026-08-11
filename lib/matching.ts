// Maximum-weight matching in a general (non-bipartite) graph — Edmonds'
// "blossom" algorithm with the primal-dual method for optimal weights, per
// Zvi Galil, "Efficient Algorithms for Finding Maximum Matching in Graphs",
// ACM Computing Surveys, 1986. O(n^3).
//
// This is a direct, structure-preserving TypeScript port of
// networkx.algorithms.matching.max_weight_matching (NetworkX, BSD-3-Clause
// license, https://networkx.org — originally by Joris van Rantwijk), adapted
// to numeric vertex ids and a dense weight function instead of a Graph
// object. The variable names, control flow, and the primal-dual bookkeeping
// (labels, dual variables, blossom bases, delta types 1-4) all mirror the
// source directly — that fidelity is deliberate: this is a notoriously easy
// algorithm to get subtly wrong, so this port stays close enough to the
// reference to be checked against it line by line, rather than being
// reconstructed from memory. `verifyOptimum` (the source's own correctness
// self-check, ported unchanged below) runs after every call in this repo's
// use — see generateNextRoundPairings in lib/swiss.ts.
//
// Why this exists: PlayerXJudge's Swiss-stage round pairing used to be a
// hand-written greedy heuristic (band by score, fold or adjacent-pair by
// seed/tie-break rank, forward-scan rematch avoidance). Verified against a
// real 44-player tournament's actual results, that heuristic reproduced the
// correct pairings for Round 2 but diverged more and more from Round 3
// onward — the real tool clearly isn't using ad-hoc rules, it's solving an
// optimization problem. This module gives lib/swiss.ts a real solver to pose
// that problem to.

type Vertex = number;

// A non-trivial blossom or sub-blossom. Trivial (single-vertex) blossoms are
// represented directly by their vertex number — same trick the Python
// original uses (a plain int is a valid dict key there; a plain number is a
// valid Map key here), so `BNode` below stands in for "a vertex number or a
// Blossom instance", exactly like the source's untyped "b".
class Blossom {
  // b.childs is an ordered list of b's sub-blossoms, starting with the base
  // and going round the blossom.
  childs: BNode[] = [];
  // b.edges is the list of b's connecting edges, such that b.edges[i] =
  // [v, w] where v is a vertex in b.childs[i] and w is a vertex in
  // b.childs[(i+1) % len].
  edges: [Vertex, Vertex][] = [];
  // If b is a top-level S-blossom, b.mybestedges is a list of least-slack
  // edges to neighboring S-blossoms, or null if not yet computed. Used for
  // efficient computation of delta3.
  mybestedges: [Vertex, Vertex][] | null = null;

  // Generate the blossom's leaf vertices.
  *leaves(): Generator<Vertex> {
    const stack: BNode[] = [...this.childs];
    while (stack.length > 0) {
      const t = stack.pop()!;
      if (t instanceof Blossom) stack.push(...t.childs);
      else yield t;
    }
  }
}

type BNode = Vertex | Blossom;

// Distinct sentinel from any real vertex/blossom (Python's `class NoNode`).
const NO_NODE = Symbol("NoNode");
type BNodeOrNone = BNode | typeof NO_NODE;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`maxWeightMatching invariant violated: ${message}`);
}

function edgeKey(v: Vertex, w: Vertex): string {
  return `${v}:${w}`;
}

export interface MaxWeightMatchingOptions {
  // If true, compute the maximum-cardinality matching with maximum weight
  // among all maximum-cardinality matchings (matters when the graph isn't
  // complete or weights can be negative — irrelevant to this repo's use,
  // where the graph is always complete with non-negative weights, so a
  // maximum-weight matching is automatically a perfect one; passed through
  // as a safety net regardless).
  maxCardinality?: boolean;
}

// `weight(i, j)` must be defined (and symmetric) for every i !== j — this
// solver assumes a complete graph, which is what every caller in this repo
// needs (any participant can in principle face any other).
export function maxWeightMatching(n: number, weight: (i: Vertex, j: Vertex) => number, options: MaxWeightMatchingOptions = {}): Vertex[] {
  const mate: (Vertex | undefined)[] = new Array(n).fill(undefined);
  if (n === 0) return [];

  const maxCardinality = options.maxCardinality ?? false;
  const gnodes: Vertex[] = Array.from({ length: n }, (_, i) => i);

  // Find the maximum edge weight; every weight used here is expected to be
  // an integer (the caller controls this), which lets the primal-dual
  // arithmetic stay exact and enables the verifyOptimum self-check.
  let maxweight = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const wt = weight(i, j);
      if (wt > maxweight) maxweight = wt;
    }
  }

  // label.get(b): undefined if b is unlabeled (free), 1 if S, 2 if T.
  // Labels are assigned during a stage and reset after each augmentation.
  const label = new Map<BNode, number>();
  // labeledge.get(b) = [v, w]: the edge through which b obtained its label,
  // such that w is a vertex in b, or null if b's base vertex is single.
  const labeledge = new Map<BNode, [Vertex, Vertex] | null>();
  // inblossom.get(v): the top-level blossom to which vertex v belongs.
  const inblossom = new Map<Vertex, BNode>(gnodes.map((v) => [v, v]));
  // blossomparent.get(b): b's immediate parent (sub-)blossom, or null if b
  // is top-level.
  const blossomparent = new Map<BNode, BNode | null>(gnodes.map((v) => [v, null]));
  // blossombase.get(b): b's base vertex.
  const blossombase = new Map<BNode, Vertex>(gnodes.map((v) => [v, v]));
  // bestedge.get(w) = [v, w]: least-slack edge from an S-vertex to free
  // vertex/blossom w, or a top-level S-blossom's least-slack edge to a
  // different S-blossom. Used for efficient delta2/delta3 computation.
  const bestedge = new Map<BNode, [Vertex, Vertex] | null>();
  // dualvar[v] = 2 * u(v), the vertex's dual-problem variable (doubled so
  // integer weights keep every value an integer throughout).
  const dualvar: number[] = new Array(n).fill(maxweight);
  // blossomdual.get(b) = z(b), a non-trivial blossom's dual variable.
  const blossomdual = new Map<Blossom, number>();
  // If edgeKey(v,w) (or (w,v)) is in allowedge, edge (v,w) is known to have
  // zero slack; otherwise it may or may not.
  const allowedge = new Map<string, true>();
  // Queue of newly discovered S-vertices.
  let queue: Vertex[] = [];

  // Return 2 * slack of edge (v, w). Does not work inside blossoms.
  function slack(v: Vertex, w: Vertex): number {
    return dualvar[v] + dualvar[w] - 2 * weight(v, w);
  }

  // Assign label t to the top-level blossom containing vertex w, reached
  // through an edge from vertex v (or null if w is being seeded directly).
  function assignLabel(w: Vertex, t: number, v: Vertex | null): void {
    const b = inblossom.get(w)!;
    assert(label.get(w) === undefined && label.get(b) === undefined, "assignLabel: already labeled");
    label.set(w, t);
    label.set(b, t);
    if (v !== null) {
      labeledge.set(w, [v, w]);
      labeledge.set(b, [v, w]);
    } else {
      labeledge.set(w, null);
      labeledge.set(b, null);
    }
    bestedge.set(w, null);
    bestedge.set(b, null);
    if (t === 1) {
      // b became an S-vertex/blossom; add its vertices to the queue.
      if (b instanceof Blossom) queue.push(...b.leaves());
      else queue.push(b);
    } else if (t === 2) {
      // b became a T-vertex/blossom; assign label S to its mate. (If b is a
      // non-trivial blossom, its base is the only vertex with an external
      // mate.)
      const base = blossombase.get(b)!;
      assignLabel(mate[base]!, 1, base);
    }
  }

  // Trace back from vertices v and w to discover either a new blossom or an
  // augmenting path. Returns the base vertex of the new blossom, or
  // NO_NODE if an augmenting path was found.
  function scanBlossom(vIn: Vertex, wIn: Vertex): BNodeOrNone {
    const path: BNode[] = [];
    let base: BNodeOrNone = NO_NODE;
    let v: Vertex | typeof NO_NODE = vIn;
    let w: Vertex | typeof NO_NODE = wIn;
    while (v !== NO_NODE) {
      const b = inblossom.get(v as Vertex)!;
      if (((label.get(b) ?? 0) & 4) !== 0) {
        base = blossombase.get(b)!;
        break;
      }
      assert(label.get(b) === 1, "scanBlossom: expected S-label");
      path.push(b);
      label.set(b, 5);
      // Trace one step back.
      const le = labeledge.get(b);
      if (le === null || le === undefined) {
        // The base of blossom b is single; stop tracing this path.
        assert(mate[blossombase.get(b)!] === undefined, "scanBlossom: base should be unmated");
        v = NO_NODE;
      } else {
        assert(le[0] === mate[blossombase.get(b)!], "scanBlossom: labeledge mismatch");
        v = le[0];
        const b2 = inblossom.get(v)!;
        assert(label.get(b2) === 2, "scanBlossom: expected T-label");
        // b2 is a T-blossom; trace one more step back.
        v = labeledge.get(b2)![0];
      }
      // Swap v and w so that we alternate between both paths.
      if (w !== NO_NODE) {
        const tmp: Vertex | typeof NO_NODE = v;
        v = w;
        w = tmp;
      }
    }
    // Remove breadcrumbs.
    for (const b of path) label.set(b, 1);
    return base;
  }

  // Construct a new blossom with given base, through S-vertices v and w.
  // Label the new blossom S; set its dual variable to zero; relabel its
  // T-vertices to S and add them to the queue.
  function addBlossom(base: Vertex, v: Vertex, w: Vertex): void {
    const bb = inblossom.get(base)!;
    let bv = inblossom.get(v)!;
    let bw = inblossom.get(w)!;
    const b = new Blossom();
    blossombase.set(b, base);
    blossomparent.set(b, null);
    blossomparent.set(bb, b);
    const path: BNode[] = [];
    const edgs: [Vertex, Vertex][] = [[v, w]];
    b.childs = path;
    b.edges = edgs;
    // Trace back from v to base.
    while (bv !== bb) {
      blossomparent.set(bv, b);
      path.push(bv);
      const le = labeledge.get(bv)!;
      edgs.push(le);
      assert(
        label.get(bv) === 2 || (label.get(bv) === 1 && le[0] === mate[blossombase.get(bv)!]),
        "addBlossom: v-side invariant"
      );
      v = le[0];
      bv = inblossom.get(v)!;
    }
    path.push(bb);
    path.reverse();
    edgs.reverse();
    // Trace back from w to base.
    while (bw !== bb) {
      blossomparent.set(bw, b);
      path.push(bw);
      const le = labeledge.get(bw)!;
      edgs.push([le[1], le[0]]);
      assert(
        label.get(bw) === 2 || (label.get(bw) === 1 && le[0] === mate[blossombase.get(bw)!]),
        "addBlossom: w-side invariant"
      );
      w = le[0];
      bw = inblossom.get(w)!;
    }
    // Set label to S.
    assert(label.get(bb) === 1, "addBlossom: base should be S-labeled");
    label.set(b, 1);
    labeledge.set(b, labeledge.get(bb) ?? null);
    blossomdual.set(b, 0);
    // Relabel vertices.
    for (const leaf of b.leaves()) {
      if (label.get(inblossom.get(leaf)!) === 2) queue.push(leaf);
      inblossom.set(leaf, b);
    }
    // Compute b.mybestedges.
    const bestedgeto = new Map<BNode, [Vertex, Vertex]>();
    for (const bvNode of path) {
      let nblist: [Vertex, Vertex][];
      if (bvNode instanceof Blossom) {
        if (bvNode.mybestedges !== null) {
          nblist = bvNode.mybestedges;
          bvNode.mybestedges = null;
        } else {
          nblist = [];
          for (const leaf of bvNode.leaves()) {
            for (let ww = 0; ww < n; ww++) if (ww !== leaf) nblist.push([leaf, ww]);
          }
        }
      } else {
        nblist = [];
        for (let ww = 0; ww < n; ww++) if (ww !== bvNode) nblist.push([bvNode, ww]);
      }
      for (const k of nblist) {
        let [i, j] = k;
        if (inblossom.get(j) === b) [i, j] = [j, i];
        const bj = inblossom.get(j)!;
        if (bj !== b && label.get(bj) === 1) {
          const existing = bestedgeto.get(bj);
          if (existing === undefined || slack(i, j) < slack(existing[0], existing[1])) {
            bestedgeto.set(bj, [i, j]);
          }
        }
      }
      // Forget about the least-slack edge of the sub-blossom.
      bestedge.set(bvNode, null);
    }
    b.mybestedges = [...bestedgeto.values()];
    // Select bestedge[b].
    let mybestedge: [Vertex, Vertex] | null = null;
    let mybestslack = 0;
    bestedge.set(b, null);
    for (const k of b.mybestedges) {
      const kslack = slack(k[0], k[1]);
      if (mybestedge === null || kslack < mybestslack) {
        mybestedge = k;
        mybestslack = kslack;
      }
    }
    bestedge.set(b, mybestedge);
  }

  // Expand the given top-level blossom. Ported with the same
  // generator/trampoline structure as the source (there to avoid Python's
  // recursion limit) — kept as-is since it maps directly onto JS generators
  // and there's no reason to diverge from the checked-against reference.
  function expandBlossom(bIn: Blossom, endstage: boolean): void {
    function* recurse(b: Blossom, endstage: boolean): Generator<Blossom> {
      // Convert sub-blossoms into top-level blossoms.
      for (const s of b.childs) {
        blossomparent.set(s, null);
        if (s instanceof Blossom) {
          if (endstage && blossomdual.get(s) === 0) {
            yield s;
          } else {
            for (const v of s.leaves()) inblossom.set(v, s);
          }
        } else {
          inblossom.set(s, s);
        }
      }
      // If we expand a T-blossom during a stage, its sub-blossoms must be
      // relabeled.
      if (!endstage && label.get(b) === 2) {
        const entrychild = inblossom.get(labeledge.get(b)![1])!;
        let j = b.childs.indexOf(entrychild);
        let jstep: 1 | -1;
        if (j & 1) {
          j -= b.childs.length;
          jstep = 1;
        } else {
          jstep = -1;
        }
        let [v, w] = labeledge.get(b)!;
        while (j !== 0) {
          let p: Vertex, q: Vertex;
          if (jstep === 1) [p, q] = b.edges[mod(j, b.edges.length)];
          else [q, p] = b.edges[mod(j - 1, b.edges.length)];
          label.delete(w);
          label.delete(q);
          assignLabel(w, 2, v);
          allowedge.set(edgeKey(p, q), true);
          allowedge.set(edgeKey(q, p), true);
          j += jstep;
          if (jstep === 1) [v, w] = b.edges[mod(j, b.edges.length)];
          else [w, v] = b.edges[mod(j - 1, b.edges.length)];
          allowedge.set(edgeKey(v, w), true);
          allowedge.set(edgeKey(w, v), true);
          j += jstep;
        }
        // Relabel the base T-sub-blossom WITHOUT stepping through to its
        // mate (so don't call assignLabel).
        const bw = b.childs[mod(j, b.childs.length)];
        label.set(w, 2);
        label.set(bw, 2);
        labeledge.set(w, [v, w]);
        labeledge.set(bw, [v, w]);
        bestedge.set(bw, null);
        j += jstep;
        while (b.childs[mod(j, b.childs.length)] !== entrychild) {
          const bv = b.childs[mod(j, b.childs.length)];
          if (label.get(bv) === 1) {
            j += jstep;
            continue;
          }
          let vv: Vertex | undefined;
          if (bv instanceof Blossom) {
            for (const cand of bv.leaves()) {
              if (label.get(cand) !== undefined) {
                vv = cand;
                break;
              }
            }
          } else {
            vv = bv;
          }
          if (vv !== undefined && label.get(vv) !== undefined) {
            assert(label.get(vv) === 2, "expandBlossom: expected T-label on reachable vertex");
            assert(inblossom.get(vv) === bv, "expandBlossom: inblossom mismatch");
            label.delete(vv);
            label.delete(mate[blossombase.get(bv)!]!);
            assignLabel(vv, 2, labeledge.get(vv)![0]);
          }
          j += jstep;
        }
      }
      // Remove the expanded blossom entirely.
      label.delete(b);
      labeledge.delete(b);
      bestedge.delete(b);
      blossomparent.delete(b);
      blossombase.delete(b);
      blossomdual.delete(b);
    }

    const stack: Generator<Blossom>[] = [recurse(bIn, endstage)];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const next = top.next();
      if (!next.done) stack.push(recurse(next.value, endstage));
      else stack.pop();
    }
  }

  function mod(i: number, len: number): number {
    return ((i % len) + len) % len;
  }

  // Swap matched/unmatched edges over an alternating path through blossom b
  // between vertex v and the base vertex. Same trampoline structure as the
  // source, for the same reason.
  function augmentBlossom(bIn: Blossom, vIn: Vertex): void {
    function* recurse(b: Blossom, v: Vertex): Generator<[Blossom, Vertex]> {
      let t: BNode = v;
      while (blossomparent.get(t) !== b) t = blossomparent.get(t)!;
      if (t instanceof Blossom) yield [t, v];
      const i = b.childs.indexOf(t);
      let j = i;
      let jstep: 1 | -1;
      if (i & 1) {
        j -= b.childs.length;
        jstep = 1;
      } else {
        jstep = -1;
      }
      while (j !== 0) {
        j += jstep;
        t = b.childs[mod(j, b.childs.length)];
        let w: Vertex, x: Vertex;
        if (jstep === 1) [w, x] = b.edges[mod(j, b.edges.length)];
        else [x, w] = b.edges[mod(j - 1, b.edges.length)];
        if (t instanceof Blossom) yield [t, w];
        j += jstep;
        t = b.childs[mod(j, b.childs.length)];
        if (t instanceof Blossom) yield [t, x];
        mate[w] = x;
        mate[x] = w;
      }
      // Rotate the list of sub-blossoms to put the new base at the front.
      b.childs = [...b.childs.slice(i), ...b.childs.slice(0, i)];
      b.edges = [...b.edges.slice(i), ...b.edges.slice(0, i)];
      blossombase.set(b, blossombase.get(b.childs[0])!);
      assert(blossombase.get(b) === v, "augmentBlossom: base mismatch after rotation");
    }

    const stack: Generator<[Blossom, Vertex]>[] = [recurse(bIn, vIn)];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const next = top.next();
      if (!next.done) stack.push(recurse(next.value[0], next.value[1]));
      else stack.pop();
    }
  }

  // Swap matched/unmatched edges over an alternating path between two
  // single vertices. The augmenting path runs through S-vertices v and w.
  function augmentMatching(vIn: Vertex, wIn: Vertex): void {
    for (let [s, j] of [
      [vIn, wIn],
      [wIn, vIn],
    ] as [Vertex, Vertex][]) {
      // Match vertex s to vertex j, then trace back from s until we find a
      // single vertex, swapping matched/unmatched edges as we go.
      for (;;) {
        const bs = inblossom.get(s)!;
        assert(label.get(bs) === 1, "augmentMatching: expected S-label");
        const bsBase = blossombase.get(bs)!;
        const bsEdge = labeledge.get(bs);
        assert(
          (bsEdge === null || bsEdge === undefined ? mate[bsBase] === undefined : bsEdge[0] === mate[bsBase]),
          "augmentMatching: labeledge/mate mismatch"
        );
        if (bs instanceof Blossom) augmentBlossom(bs, s);
        mate[s] = j;
        if (bsEdge === null || bsEdge === undefined) break;
        const t = bsEdge[0];
        const bt = inblossom.get(t)!;
        assert(label.get(bt) === 2, "augmentMatching: expected T-label");
        [s, j] = labeledge.get(bt)!;
        assert(blossombase.get(bt) === t, "augmentMatching: base mismatch");
        if (bt instanceof Blossom) augmentBlossom(bt, j);
        mate[j] = s;
      }
    }
  }

  // Verify that the optimum solution has been reached — the source's own
  // correctness self-check (KKT / complementary-slackness conditions),
  // ported unchanged and left enabled: given how easy this algorithm is to
  // get subtly wrong, this is worth the (still-trivial, at this problem
  // size) cost of always running it.
  function verifyOptimum(): void {
    const vdualoffset = maxCardinality ? Math.max(0, -Math.min(...dualvar)) : 0;
    assert(Math.min(...dualvar) + vdualoffset >= 0, "verifyOptimum: negative vertex dual");
    assert(blossomdual.size === 0 || Math.min(...blossomdual.values()) >= 0, "verifyOptimum: negative blossom dual");
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const wt = weight(i, j);
        let s = dualvar[i] + dualvar[j] - 2 * wt;
        const iblossoms: BNode[] = [i];
        const jblossoms: BNode[] = [j];
        while ((blossomparent.get(iblossoms[iblossoms.length - 1]) ?? null) !== null) {
          iblossoms.push(blossomparent.get(iblossoms[iblossoms.length - 1])!);
        }
        while ((blossomparent.get(jblossoms[jblossoms.length - 1]) ?? null) !== null) {
          jblossoms.push(blossomparent.get(jblossoms[jblossoms.length - 1])!);
        }
        iblossoms.reverse();
        jblossoms.reverse();
        for (let k = 0; k < Math.min(iblossoms.length, jblossoms.length); k++) {
          const bi = iblossoms[k];
          const bj = jblossoms[k];
          if (bi !== bj) break;
          s += 2 * (blossomdual.get(bi as Blossom) ?? 0);
        }
        assert(s >= 0, "verifyOptimum: negative edge slack");
        if (mate[i] === j || mate[j] === i) {
          assert(mate[i] === j && mate[j] === i, "verifyOptimum: asymmetric mate");
          assert(s === 0, "verifyOptimum: matched edge with nonzero slack");
        }
      }
    }
    for (const v of gnodes) {
      assert(mate[v] !== undefined || dualvar[v] + vdualoffset === 0, "verifyOptimum: unmatched vertex with nonzero dual");
    }
    for (const [b, bdual] of blossomdual) {
      if (bdual > 0) {
        assert(b.edges.length % 2 === 1, "verifyOptimum: full blossom must have odd edge count");
        for (let k = 1; k < b.edges.length; k += 2) {
          const [i, j] = b.edges[k];
          assert(mate[i] === j && mate[j] === i, "verifyOptimum: blossom edge not matched");
        }
      }
    }
  }

  // Main loop: continue until no further improvement is possible.
  for (;;) {
    // Each iteration of this loop is a "stage": find an augmenting path and
    // use it to improve the matching.
    label.clear();
    labeledge.clear();
    bestedge.clear();
    for (const b of blossomdual.keys()) b.mybestedges = null;
    allowedge.clear();
    queue = [];

    // Label single blossoms/vertices with S and put them in the queue.
    for (const v of gnodes) {
      if (mate[v] === undefined && label.get(inblossom.get(v)!) === undefined) assignLabel(v, 1, null);
    }

    let augmented = false;
    for (;;) {
      // Each iteration of this loop is a "substage": try to find an
      // augmenting path; if none exists, pump slack out of the dual
      // variables via the primal-dual method.
      while (queue.length > 0 && !augmented) {
        const v = queue.pop()!;
        assert(label.get(inblossom.get(v)!) === 1, "main loop: dequeued non-S vertex");

        for (let w = 0; w < n; w++) {
          if (w === v) continue;
          const bv = inblossom.get(v)!;
          const bw = inblossom.get(w)!;
          if (bv === bw) continue; // internal to a blossom; ignore
          let kslack = 0;
          const key = edgeKey(v, w);
          if (!allowedge.has(key)) {
            kslack = slack(v, w);
            if (kslack <= 0) {
              allowedge.set(key, true);
              allowedge.set(edgeKey(w, v), true);
            }
          }
          if (allowedge.has(key)) {
            if (label.get(bw) === undefined) {
              // (C1) w is free; label it T and its mate S.
              assignLabel(w, 2, v);
            } else if (label.get(bw) === 1) {
              // (C2) w is an S-vertex; find an augmenting path or a blossom.
              const base = scanBlossom(v, w);
              if (base !== NO_NODE) {
                addBlossom(base as Vertex, v, w);
              } else {
                augmentMatching(v, w);
                augmented = true;
                break;
              }
            } else if (label.get(w) === undefined) {
              // w is inside a T-blossom, not yet individually reached.
              assert(label.get(bw) === 2, "main loop: expected T-label");
              label.set(w, 2);
              labeledge.set(w, [v, w]);
            }
          } else if (label.get(bw) === 1) {
            const cur = bestedge.get(bv);
            if (cur === undefined || cur === null || kslack < slack(cur[0], cur[1])) bestedge.set(bv, [v, w]);
          } else if (label.get(w) === undefined) {
            const cur = bestedge.get(w);
            if (cur === undefined || cur === null || kslack < slack(cur[0], cur[1])) bestedge.set(w, [v, w]);
          }
        }
      }

      if (augmented) break;

      // No augmenting path under current constraints; compute delta and
      // reduce slack. (Vertex duals, slacks, and deltas are pre-doubled.)
      let deltatype = -1;
      let delta = 0;
      let deltaedge: [Vertex, Vertex] | null = null;
      let deltablossom: Blossom | null = null;

      if (!maxCardinality) {
        deltatype = 1;
        delta = Math.min(...dualvar);
      }

      for (const v of gnodes) {
        if (label.get(inblossom.get(v)!) === undefined && bestedge.get(v)) {
          const d = slack(bestedge.get(v)![0], bestedge.get(v)![1]);
          if (deltatype === -1 || d < delta) {
            delta = d;
            deltatype = 2;
            deltaedge = bestedge.get(v)!;
          }
        }
      }

      for (const [b, parent] of blossomparent) {
        if (parent === null && label.get(b) === 1 && bestedge.get(b)) {
          const kslack = slack(bestedge.get(b)![0], bestedge.get(b)![1]);
          const d = kslack / 2;
          if (deltatype === -1 || d < delta) {
            delta = d;
            deltatype = 3;
            deltaedge = bestedge.get(b)!;
          }
        }
      }

      for (const [b, bdual] of blossomdual) {
        if (blossomparent.get(b) === null && label.get(b) === 2 && (deltatype === -1 || bdual < delta)) {
          delta = bdual;
          deltatype = 4;
          deltablossom = b;
        }
      }

      if (deltatype === -1) {
        assert(maxCardinality, "main loop: no delta type found without maxCardinality");
        deltatype = 1;
        delta = Math.max(0, Math.min(...dualvar));
      }

      for (const v of gnodes) {
        const lb = label.get(inblossom.get(v)!);
        if (lb === 1) dualvar[v] -= delta;
        else if (lb === 2) dualvar[v] += delta;
      }
      for (const [b, bdual] of blossomdual) {
        if (blossomparent.get(b) === null) {
          if (label.get(b) === 1) blossomdual.set(b, bdual + delta);
          else if (label.get(b) === 2) blossomdual.set(b, bdual - delta);
        }
      }

      if (deltatype === 1) {
        break;
      } else if (deltatype === 2) {
        const [v, w] = deltaedge!;
        assert(label.get(inblossom.get(v)!) === 1, "main loop: delta2 edge should start at S-vertex");
        allowedge.set(edgeKey(v, w), true);
        allowedge.set(edgeKey(w, v), true);
        queue.push(v);
      } else if (deltatype === 3) {
        const [v, w] = deltaedge!;
        allowedge.set(edgeKey(v, w), true);
        allowedge.set(edgeKey(w, v), true);
        assert(label.get(inblossom.get(v)!) === 1, "main loop: delta3 edge should start at S-vertex");
        queue.push(v);
      } else if (deltatype === 4) {
        expandBlossom(deltablossom!, false);
      }
    }

    for (const v of gnodes) {
      if (mate[v] !== undefined) assert(mate[mate[v]!] === v, "main loop: asymmetric mate after stage");
    }

    if (!augmented) break;

    // End of stage: expand all S-blossoms which have zero dual.
    for (const b of [...blossomdual.keys()]) {
      if (!blossomdual.has(b)) continue; // already expanded
      if (blossomparent.get(b) === null && label.get(b) === 1 && blossomdual.get(b) === 0) {
        expandBlossom(b, true);
      }
    }
  }

  verifyOptimum();

  return mate.map((m) => m ?? -1);
}
