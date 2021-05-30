import { Graph, mkEdge, mkPair} from "./graph";

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



console.log(g.stringify(x => x.kind == "none" ? "0" : "1"))

// Get from node 2
let edges_from_node_two = g.getEdgesFrom(2)

// fruchtermanReingold algorithm to calculate a prety looking layout for the graph
let layout = g.fruchtermanReingold()



let g2 = Graph<number>(4)

g2 = g2
.setEdge(mkEdge(0, 1), 1)
.setEdge(mkEdge(0, 2), 1)
.setEdge(mkEdge(1, 2), 1)
.setEdge(mkEdge(2, 0), 1)
.setEdge(mkEdge(2, 3), 1)
.setEdge(mkEdge(3, 3), 1)

console.log(g2.stringify(undefined, false))
g2.DFS(2)