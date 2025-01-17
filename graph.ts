type Option<a> = {
    kind: 'some'
    v: a
} | {
    kind: 'none'
}

const some = <a>(v: a): Option<a> => ({ kind: 'some', v: v })
const none = <a>(): Option<a> => ({ kind: 'none' })

interface Pair<a, b> {
    first: a,
    second: b
}

export const mkPair = <a, b>(fst: a, snd: b): Pair<a, b> => ({ first: fst, second: snd })

interface Func<a, b> {
    f: (_: a) => b
    then: <c>(this: Func<a, b>, g: Func<b, c>) => Func<a, c>
    repeat: (this: Func<a, a>) => Func<number, Func<a, a>>
    repeatUntil: (this: Func<a, a>) => Func<Func<a, boolean>, Func<a, a>>
}

let Func = <a, b>(f: (_: a) => b): Func<a, b> => {
    return {
        f: f,
        then: function <c>(this: Func<a, b>, g: Func<b, c>): Func<a, c> {
            return Func<a, c>(x => g.f(this.f(x)))
        },
        repeat: function (this: Func<a, a>): Func<number, Func<a, a>> {
            return Func<number, Func<a, a>>(n => repeat(this, n))
        },
        repeatUntil: function (this: Func<a, a>): Func<Func<a, boolean>, Func<a, a>> {
            return Func<Func<a, boolean>, Func<a, a>>(p => repeatUntil(this, p))
        }
    }
}

let Identity = <a>(): Func<a, a> => Func(x => x)


let repeat = function <a>(f: Func<a, a>, n: number): Func<a, a> {
    // This method is basically a for
    // let res: Func<a, a> = Identity()
    // for (let c = 0; c < n; c++) {
    //     res = res.then(f)
    // }
    // return res
    if (n > 900) throw `Max size for n: ${n} reached. To prevent maximum recursion depth errors, split this method over a for loop`

    if (n <= 0) {
        return Identity<a>() // Return the identity function when n <= 0, basicly means do nothing
    }
    else {
        return f.then(repeat(f, n - 1)) // Else build a chain then's, pass f around and decrement n
    }
}

let repeatUntil = function <a>(f: Func<a, a>, predicate: Func<a, boolean>): Func<a, a> {
    let g = (x: a) => {
        // An imperative approach
        // let res: a = Identity<a>().f(x)
        // while (predicate.f(res)) {
        //     res = f.f(res)
        // }
        // return res

        if (predicate.f(x)) {
            return Identity<a>().f(x) // If predicate is true apply the identity function to x
        }
        else {
            return f.then(repeatUntil(f, predicate)).f(x) // Else build a chain of then's pass f around and apply f to x
        }
    }
    return Func<a, a>(g)
}


type Matrix<T> = Option<T>[][]

type Edge<a = any> = {
    fromIndex: number
    toIndex: number
    weight?: a
}

export const mkEdge = <a = any>(fromIndex: number, toIndex: number, weight?: a): Edge<a> => ({ fromIndex: fromIndex, toIndex: toIndex, weight: weight })


const createArray = <a>(init: a) => Func<number, Func<a[], a[]>>(n => Func(l => new Array(n).fill(init)))
// const createArray = <a>(init: a) => Func<number, Func<a[], a[]>>(n => Func<a[], a[]>(l => l.concat(init)).repeat().f(n))

const addNode = <T>(): Func<Matrix<T>, Matrix<T>> => Func(g => g.concat([createArray(none<T>()).f(g.length).f([])]).map(m => m.concat(none<T>())))

const addNodes = <T>(n: number): Func<Matrix<T>, Matrix<T>> => addNode<T>().repeat().f(n)

const createGraph = <T>(size: number) => (init: Matrix<T>): Matrix<T> => addNodes<T>(size).f(init)

const initGraph = <T>(size: number): Matrix<T> => {
    return createGraph<T>(size)([])
}


const removeNode = <T>(node: number): Func<Matrix<T>, Matrix<T>> => Func(g => {
    return g.reduce((xs, x, indexX) => {
        // remove vertical row 
        x = x.reduce((ys, y, indexY) => {
            if (indexY == node) {
                return ys
            }
            return ys.concat([y])
        }, Array<Option<T>>())

        // Remove horizontal row 
        if (indexX == node) {
            return xs
        }
        return xs.concat([x])
    }, Array<Array<Option<T>>>())
})

const removeNodes = <T>(...nodes: number[]): Func<Matrix<T>, Matrix<T>> => {
    return nodes.filter((a, b) => nodes.indexOf(a) == b).sort((a, b) => b - a)
        .map(node => removeNode<T>(node)).reduce((xs, x) => xs.then(x), Identity())
}

const getEdges = <T>(): Func<Matrix<T>, Edge[]> => Func(g => g.flatMap((row, rowIndex) => {
    return row.reduce((xs, x, columnIndex) => {
        if (x.kind == 'some') {
            return xs.concat(mkEdge(rowIndex, columnIndex))
        }
        return xs
    }, Array<Edge>())
}))

const getEdgesFrom = <T>(fromIndex: number, G: Matrix<T>): Edge[] => G[fromIndex].reduce((xs, x, toIndex) => (x.kind == 'some') ? xs.concat(mkEdge(fromIndex, toIndex)) : xs, Array<Edge>())
const getEdgesTo = <T>(toIndex: number, G: Matrix<T>): Edge[] => G.reduce((xs, x, fromIndex) => (x[toIndex].kind == 'some') ? xs.concat(mkEdge(fromIndex, toIndex)) : xs, Array<Edge>())


const removeEdge = <T>(): Func<Edge, Func<Matrix<T>, Matrix<T>>> => Func(edge => Func(g => {
    g[edge.fromIndex][edge.toIndex] = none()
    g[edge.toIndex][edge.fromIndex] = none()
    return g
}))

const removeEdges = <T>(): Func<Edge[], Func<Matrix<T>, Matrix<T>>> => Func(edges => {
    return edges.map(edge => removeEdge<T>().f(edge)).reduce((xs, x) => xs.then(x), Identity())
})

const addEdge = <a, T>(edge: Edge<a>, value: Option<T>, G: Matrix<T>): Matrix<T> => {
    G[edge.fromIndex][edge.toIndex] = value
    if (edge.toIndex != edge.fromIndex) G[edge.toIndex][edge.fromIndex] = none()
    return G
}


const addEdges = <T>(): Func<Pair<T, Edge>[], Func<Matrix<T>, Matrix<T>>> => Func(edges => {
    return edges.map(edge => Func<Matrix<T>, Matrix<T>>(G => addEdge(edge.second, some(edge.first), G))).reduce((xs, x) => xs.then(x), Identity())
})

const getRandomArbitrary = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
}
export interface Vector2D {
    x: number
    y: number
    length: number
    assign: (v: Vector2D) => Vector2D
    Plus: (v: Vector2D) => Vector2D
    Min: (v: Vector2D) => Vector2D
    divide: (n: number) => Vector2D
    times: (n: number) => Vector2D
    equals: (vector: Vector2D) => boolean
}

export let Vector2D = (x: number, y: number): Vector2D => ({
    x: x,
    y: y,
    Min: function (v: Vector2D): Vector2D {
        return Vector2D(this.x - v.x, this.y - v.y)
    },
    Plus: function (v: Vector2D): Vector2D {
        return Vector2D(this.x + v.x, this.y + v.y)
    },
    assign: function (v: Vector2D): Vector2D {
        return v
    },
    divide: function (n: number): Vector2D {
        if (n > 0) {
            return Vector2D(this.x / n, this.y / n)
        }
        throw 'Divission by 0'

    },
    length: Math.sqrt(x ** 2 + y ** 2),
    times: function (n: number): Vector2D {
        return Vector2D(this.x * n, this.y * n)
    }, 
    equals: function (vector: Vector2D): boolean {
        return this.x == vector.x && this.y == vector.y
    }

})

let createLayout = <T>(w: number, h: number): Func<Matrix<T>, Vector2D[]> => Func(g => g.map(_ => Vector2D(Math.ceil(getRandomArbitrary(0, w - 100)), Math.ceil(getRandomArbitrary(0, h - 100)))))

// fruchtermanReingold algorithm
let fruchtermanReingold = <T>(G: Matrix<T>, W = 1000, H = 1000, iterations = 50, edge_length?: number): Vector2D[] => {
    let area = W * H
    let edges = getEdges().f(G)
    let k = edge_length == undefined ? Math.sqrt(area / G.length) : edge_length //maximum distance of the nodes
    let fa = (x: number): number => x ** 2 / k // Formula to calculate attractive forces
    let fr = (x: number): number => k ** 2 / x // Formula to calculate repulsive forces

    // initial positions
    let positions = createLayout(W, H).f(G)
    let displacements = G.map(_ => Vector2D(0, 0))

    let t = W / 10
    let dt = t / (iterations + 1)

    //console.log(`area: ${area}`)
    //console.log(`k: ${k}`)
    //console.log(`t: ${t}, dt: ${dt}`)

    for (let i = 1; i <= iterations; i++) {
        //console.log(`Iteration: ${i}`)

        // Calculate repulsive forces
        G.forEach((v, indexV) => {
            displacements[indexV] = Vector2D(0, 0)
            v.forEach((u, indexU) => { // It doesn't matter if you iterate over v or G
                if (indexU != indexV) {
                    let delta = positions[indexV].Min(positions[indexU])
                    if (delta.length != 0) {
                        displacements[indexV] = displacements[indexV].Plus(delta.divide(delta.length).times(fr(delta.length)))
                    }

                }
            })
        })

        // Calculate attractive forces
        edges.forEach(edge => {
            let delta = positions[edge.toIndex].Min(positions[edge.fromIndex])
            if (delta.length != 0) {
                displacements[edge.toIndex] = displacements[edge.toIndex].Min(delta.divide(delta.length).times(fa(delta.length)))
                displacements[edge.fromIndex] = displacements[edge.fromIndex].Plus(delta.divide(delta.length).times(fa(delta.length)))
            }
        })

        // limit max displacement
        G.forEach((node, index) => {
            if (displacements[index].length != 0) {
                positions[index] = positions[index].Plus(displacements[index].divide(displacements[index].length).times(Math.min(displacements.length, t)))
            }
            positions[index].x = Math.min(W / 2, Math.max(-W / 2, positions[index].x))
            positions[index].y = Math.min(H / 2, Math.max(-H / 2, positions[index].y))
        })

        // reduce the temperature as the layout approaches a better conﬁguration
        t -= dt
    }

    //console.log('Done...')

    // Still some nodes appear outsoide of the screen, so just move the position by fixed number
    return positions.map(vector => vector.Plus(Vector2D(200, 200)))
}


const DFS_util = <T>(G: Matrix<T>, v: number, visited: boolean[]): void => {
    visited[v] = true 
    console.log(v)

    let vList = G[v]
    vList.forEach((node, n) => {
        if (!visited[n]) {
            DFS_util(G, n, visited)
        }
    })
}

export interface Graph<T> {
    G: Matrix<T>
    incr: (n?: number) => Graph<T>
    removeNode: (index: number) => Graph<T>
    removeNodes: (...indices: number[]) => Graph<T>
    getEdgesFrom: (fromIndex: number) => Edge[]
    getEdgesTo: (toIndex: number) => Edge[]
    getEdges: () => Edge[]
    setEdge: <a = any>(edge: Edge<a>, value: T) => Graph<T>
    setEdges: <a = any>(...edges: Pair<T, Edge<a>>[]) => Graph<T>
    removeEdge: (edge: Edge) => Graph<T>
    removeEdges: (...edges: Edge[]) => Graph<T>
    fruchtermanReingold: (W?: number, H?: number, iterations?: number, edge_length?: number) => Vector2D[]
    DFS: (node: number) => void
    stringify: (f?: (_: Option<T>) => string, brackets?: boolean) => string
}

/**
 * Constructor method for a Graph, reperesented as an adjacency matrix. 
 * The graph is an immutable object, it will always return a new object after modification.
 * @param size default = 0
 * @returns Graph
 */
export const Graph = <T>(size = 0): Graph<T> => ({
    G: initGraph(size),

    /**
     * Increment the size of the graph by n. 
     * @param this 
     * @param n default = 1
     * @returns 
     */
    incr: function (this: Graph<T>, n = 1): Graph<T> {
        return ({ ...this, G: addNodes<T>(n).f(this.G) })
    },

    /**
     * Remove a certain node from the graph given by its index.
     * @param index 
     * @returns 
     */
    removeNode: function (index: number): Graph<T> {
        return ({ ...this, G: removeNode<T>(index).f(this.G) })
    },

    /**
     * Remove multiple nodes from the matrix
     * @param indices 
     * @returns 
     */
    removeNodes: function (...indices: number[]): Graph<T> {
        return ({ ...this, G: removeNodes<T>(...indices).f(this.G) })
    },

    /**
     * Get all the edges from a certain node. 
     * @param fromIndex 
     * @returns 
     */
    getEdgesFrom: function (fromIndex: number): Edge[] {
        return getEdgesFrom(fromIndex, this.G)
    },

    /**
     * Get all the edges to a certain node.
     * @param toIndex 
     * @returns 
     */
    getEdgesTo: function (toIndex: number): Edge[] {
        return getEdgesTo(toIndex, this.G)
    },

    /**
     * Get all edges on the Graph.
     * @returns 
     */
    getEdges: function (): Edge[] {
        return getEdges().f(this.G)
    },

    /**
     * Set an edge, you can use mkEdge to construct an edge. 
     * @param edge 
     * @param value 
     * @returns 
     */
    setEdge: function <a = any>(edge: Edge<a>, value: T): Graph<T> {
        return ({ ...this, G: addEdge(edge, some(value), this.G) })
    },

    /**
     * Set multiple edges, you can use mkPair to construct the Pair type. 
     * @param edges 
     * @returns 
     */
    setEdges: function <a = any>(...edges: Pair<T, Edge<a>>[]): Graph<T> {
        return ({ ...this, G: addEdges<T>().f(edges).f(this.G) })
    },

    /**
     * Remove an edge from the graph
     * @param edge 
     * @returns 
     */
    removeEdge: function (edge: Edge): Graph<T> {
        return ({ ...this, G: removeEdge<T>().f(edge).f(this.G) })
    },

    /**
     * Remove multiple edges from the graph
     * @param edges 
     * @returns 
     */
    removeEdges: function (...edges: Edge[]): Graph<T> {
        return ({ ...this, G: removeEdges<T>().f(edges).f(this.G) })
    },

    fruchtermanReingold: function (W?: number, H?: number, iterations?: number, edge_length?: number): Vector2D[] {
        return fruchtermanReingold(this.G, W, H, iterations, edge_length)
    },

    DFS: function (node: number): void {
        let visited: boolean[] = Array(this.G.length).fill(false)
        DFS_util(this.G, node, visited)
    },

    stringify: function (f: (_: Option<T>) => string = (o) => o.kind == 'none' ? '0' : String(o.v), brackets = true): string {
        let end_bracket = (has: boolean) => has ? "]" : ""
        let start_bracket = (has: boolean) => has ? "[" : ""
        return this.G.reduce((ys, row, to) =>
            ys + row.reduce((xs, x, from) => xs + f(x) + ", ", start_bracket(brackets)).trimEnd() + end_bracket(brackets) + "\n"
            , start_bracket(brackets) + "\n") + end_bracket(brackets)
    }
})

