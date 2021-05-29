import { Graph, mkEdge, mkPair } from "./graph";

let g = Graph<boolean>(5)

g = g.incr(1)
.setEdge(mkEdge(0, 1), true)

g = g.setEdges(
    mkPair(true, mkEdge(1, 2)), 
    mkPair(true, mkEdge(2, 4)), 
    mkPair(true, mkEdge(2, 0)), 
    mkPair(true, mkEdge(4, 0)),
    mkPair(true, mkEdge(3, 4)), 
    mkPair(true, mkEdge(4, 5)),
    mkPair(true, mkEdge(5, 3)),
)
.removeEdge(mkEdge(4, 0))

console.log(g.stringify(x => x.kind == "none" ? "0" : "1", false))

console.log(g.getEdgesFrom(2))
