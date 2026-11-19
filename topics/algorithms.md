# Algorithms

## Sorting

- [ ] **Bubble, selection and insertion sort**
- [ ] **Shell sort**
- [ ] **Merge sort** — needs: recurrences
- [ ] **Quicksort** (pivot choice, Lomuto vs Hoare, 3-way) — needs: recurrences
- [ ] **Dual-pivot quicksort** — wild: Arrays.sort for primitives
- [ ] **Heap sort** — needs: binary heap
- [ ] **TimSort** — needs: merge sort, insertion sort · wild: Arrays.sort for objects
- [ ] **Introsort and pattern-defeating quicksort**
- [ ] **Counting sort**
- [ ] **Radix sort**
- [ ] **Bucket sort**
- [ ] **External merge sort**
- [ ] **Stability, and why it matters**
- [ ] **The Ω(n log n) comparison lower bound**
- [ ] **Sorting networks**

## Searching and selection

- [ ] **Binary search and its boundary variants**
- [ ] **Binary search on the answer**
- [ ] **Search in rotated and bitonic arrays** — needs: binary search
- [ ] **Ternary search**
- [ ] **Exponential and interpolation search**
- [ ] **Quickselect** — needs: quicksort
- [ ] **Median of medians**

## Problem-solving patterns

- [ ] **Two pointers**
- [ ] **Sliding window** (fixed and variable)
- [ ] **Fast and slow pointers** (Floyd's cycle detection)
- [ ] **Prefix sums and 2D prefix sums**
- [ ] **Difference arrays**
- [ ] **Merge intervals**
- [ ] **Sweep line**
- [ ] **Cyclic sort**
- [ ] **Top-k with a heap** — needs: binary heap
- [ ] **K-way merge** — needs: binary heap
- [ ] **Monotonic stack problems** — needs: monotonic stack
- [ ] **In-place linked list reversal**
- [ ] **Matrix traversal** (spiral, diagonal, rotation)
- [ ] **Meet in the middle**
- [ ] **Coordinate compression**
- [ ] **Hash map lookups replacing nested loops** — needs: hash map
- [ ] **Boyer-Moore majority vote**
- [ ] **Kadane's algorithm**
- [ ] **Dutch national flag**

## Recursion and backtracking

- [ ] **Recursion, the call stack and tail calls**
- [ ] **Subsets**
- [ ] **Permutations**
- [ ] **Combinations and combination sum**
- [ ] **N-queens**
- [ ] **Sudoku solver**
- [ ] **Word search and path finding in grids**
- [ ] **Pruning strategies**
- [ ] **Branch and bound**

## Divide and conquer

- [ ] **Counting inversions** — needs: merge sort
- [ ] **Closest pair of points**
- [ ] **Karatsuba multiplication**
- [ ] **Strassen matrix multiplication**
- [ ] **Fast exponentiation**

## Greedy

- [ ] **Interval scheduling and activity selection**
- [ ] **Huffman coding** — needs: binary heap
- [ ] **Fractional knapsack**
- [ ] **Jump game and gas station style problems**
- [ ] **Exchange arguments: proving a greedy choice**
- [ ] **Matroids, briefly**

## Dynamic programming

- [ ] **Memoisation vs tabulation**
- [ ] **1D DP** (climbing stairs, house robber, coin change)
- [ ] **2D grid DP**
- [ ] **0/1, unbounded and bounded knapsack**
- [ ] **Longest increasing subsequence** (O(n²) and O(n log n))
- [ ] **Longest common subsequence**
- [ ] **Edit distance**
- [ ] **Palindrome DP**
- [ ] **Interval DP** (matrix chain, burst balloons)
- [ ] **DP on trees**
- [ ] **DP on DAGs**
- [ ] **Bitmask DP** — needs: bit manipulation
- [ ] **Digit DP**
- [ ] **Probability and expected value DP**
- [ ] **State machine DP** (stock problems)
- [ ] **Space optimisation with rolling arrays**
- [ ] **Convex hull trick and Li Chao tree**
- [ ] **Knuth and divide-and-conquer optimisation**

## Graphs

- [ ] **Breadth-first search**
- [ ] **Depth-first search**
- [ ] **Multi-source BFS and 0-1 BFS**
- [ ] **Bidirectional search**
- [ ] **Flood fill and islands**
- [ ] **Topological sort** (Kahn and DFS)
- [ ] **Cycle detection** (directed and undirected)
- [ ] **Connected components** — needs: union-find or DFS
- [ ] **Strongly connected components** (Tarjan, Kosaraju)
- [ ] **Bridges and articulation points**
- [ ] **Bipartite check and two-colouring**
- [ ] **Dijkstra** — needs: binary heap
- [ ] **Bellman-Ford and SPFA**
- [ ] **Floyd-Warshall**
- [ ] **Johnson's algorithm**
- [ ] **A\* search**
- [ ] **Minimum spanning tree** (Kruskal, Prim, Borůvka) — needs: union-find
- [ ] **Maximum flow** (Ford-Fulkerson, Edmonds-Karp, Dinic)
- [ ] **Min cut and max-flow min-cut**
- [ ] **Bipartite matching** (Hopcroft-Karp, Hungarian)
- [ ] **Eulerian path and circuit**
- [ ] **Hamiltonian path and travelling salesman DP**
- [ ] **Lowest common ancestor** (binary lifting, Euler tour)
- [ ] **Heavy-light decomposition**
- [ ] **Centroid decomposition**
- [ ] **2-SAT** — needs: strongly connected components
- [ ] **Graph colouring**
- [ ] **PageRank and random walks**

## Strings

- [ ] **Knuth-Morris-Pratt**
- [ ] **Z-algorithm**
- [ ] **Rabin-Karp and rolling hash**
- [ ] **Boyer-Moore and Horspool** — wild: String.indexOf intrinsics
- [ ] **Manacher's algorithm**
- [ ] **Aho-Corasick multi-pattern search**
- [ ] **Suffix array construction**
- [ ] **Regular expression matching** (backtracking, NFA, DFA) — wild: java.util.regex, RE2
- [ ] **Levenshtein automata and fuzzy search** — wild: Lucene
- [ ] **Anagram and palindrome techniques**

## Maths and number theory

- [ ] **GCD, LCM and extended Euclid**
- [ ] **Modular arithmetic and modular inverse**
- [ ] **Sieve of Eratosthenes**
- [ ] **Primality testing** (trial division, Miller-Rabin)
- [ ] **Combinatorics: nCr under a modulus**
- [ ] **Inclusion-exclusion**
- [ ] **Catalan numbers**
- [ ] **Matrix exponentiation**
- [ ] **Fast Fourier transform**
- [ ] **Game theory: Nim and Sprague-Grundy**

## Bit manipulation

- [ ] **Masks, shifts and common idioms**
- [ ] **XOR tricks** (single number, swaps, parity)
- [ ] **Population count and bit scans** — wild: Integer.bitCount intrinsics
- [ ] **Enumerating subsets and submasks**
- [ ] **Gray code**

## Geometry

- [ ] **Orientation and cross product**
- [ ] **Convex hull** (Graham scan, Andrew's monotone chain)
- [ ] **Segment intersection**
- [ ] **Point in polygon**
- [ ] **Rotating calipers**

## Randomised and approximate

- [ ] **Fisher-Yates shuffle** — wild: Collections.shuffle
- [ ] **Reservoir sampling**
- [ ] **Randomised quicksort and expected running time**
- [ ] **Monte Carlo vs Las Vegas algorithms**
- [ ] **Weighted random selection and alias method**
- [ ] **Approximation algorithms** (vertex cover, set cover)

## Compression, encoding and integrity

- [ ] **Run-length encoding**
- [ ] **LZ77 and LZ78** — wild: java.util.zip
- [ ] **Arithmetic coding**
- [ ] **Variable-length integers and zig-zag encoding** — wild: Protobuf
- [ ] **Delta encoding**
- [ ] **Checksums and CRC** — wild: java.util.zip.CRC32
- [ ] **Hamming and Reed-Solomon codes**
- [ ] **Base64 and friends**

## Hard problems

- [ ] **P, NP and NP-completeness**
- [ ] **Reductions**
- [ ] **Heuristics and local search**
- [ ] **Simulated annealing and genetic algorithms**
