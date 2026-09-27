# Group connectors — QuantumTech ecosystem

**Question the view answers:** *who connects groups of organisations that are otherwise not connected?*

## Run it

Node 22.12+:

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # tsc --noEmit (strict) + dist/index.html (single self-contained file)
```

The built `dist/index.html` opens with a double-click: no server, no internet needed; JS, CSS, the CSVs and `schema.json` are all inlined into that one file.

How an analyst uses it: press **Show who connects the groups**. Read the ranked list. Click a name to see which groups it links and what falls apart without it. Flip **Ignore investments** to see only operational ties.

## 1. What I built

A single-page graph viewer (Sigma.js/WebGL) written in TypeScript (strict mode, classes, no UI framework). On load it parses the CSVs, cleans them and runs the analysis in the browser with graphology. It splits the network into groups of organisations that mostly work with each other (Louvain communities) and scores every organisation on how much the groups depend on it. The page answers the question with a button and a ranked list written in plain sentences, for example "Without Pasqal, 20 organisations lose every connection to the rest" or "The only link between group A and group B". It does not expect anyone to read the answer off the picture.

Two measures drive the list, and both can be explained without graph theory:
- **Cut-off**: if we remove this organisation, how many others end up with no path to the rest? (articulation points)
- **Rare bridge**: for each pair of groups it touches, how many organisations link that pair at all? "1 of 1" is the strongest signal; "1 of 21" is noise.

Betweenness is computed too, but I use it only as a tie-breaker. The top-betweenness node (Quantonation, 53 links) is exactly the "big hub" that looks important but is not the answer: every pair of groups it links is also linked by 10+ other organisations. The page says this explicitly, so the analyst doesn't wonder why the biggest dot is missing.

## 2. What I noticed about the data

- **Dirty edges.** 9 relationships point to IDs that don't exist in `organizations.csv` (e.g. `ORG-0000`, `ORG-0305`). There are 3 self-links and 5 undirected relationships stored twice (A→B and B→A, same type and year). All of these are dropped; the note at the bottom of the sidebar counts them and each count expands into the list of rows. A relationship that had a duplicate is marked "×2" in the organisation card.
- **Gaps.** 29 organisations have country, city and founded year all empty, which suggests one incomplete source rather than random gaps. 13 organisations have no relationships at all; they are drawn as a separate grey "Without links" group (in a filtered view it also holds those whose only links were filtered out). Investors all have `subsector = services`, so the field carries no information for them.
- **Money is the glue.** 44% of relationships are `invested_in`, and 116 of the 169 links *between* groups are investments. If investments are ignored, the investors form their own world: 20 funds tied together by partnerships and shared board members. That world is connected to the operating companies by **one** relationship (Pasqal–Quantonation partnership, 2024). This is the reason for the "Ignore investments" switch: "who connects groups" has a different answer depending on whether shared money counts as a connection.
- **Small things.** `direction` always follows from `rel_type`, so the schema does not repeat it: directedness is read from this column. `acquired` occurs once. 65 relationships are dated 2026. One non-investor invests (NVIDIA → Quantinuum). University of Oxford is "founded 1096", which is correct but breaks any founded-year axis.

## 3. A second database arrives tomorrow

**Works unchanged:** the metrics (communities, cut-off, rare bridges, betweenness), the layout, the whole front end, the sentence templates, and the cleaning rules (unknown IDs, self-links, duplicates). The front end has no hard-coded entity or relationship names. `schema.json` only maps columns and lists the filter views; type labels are the type names humanised (`research_institute` → "Research institute"), directedness comes from the `direction` column of each relationship, the attributes shown for an organisation are all its other CSV columns, and the analysis parameters have defaults in code (`analysis` in the schema can override them). "All relationships" is always the first view.

**Would change:** a new `schema.json`, which covers the column mapping and which relationship types a view may ignore. "Ignore investments" is only a config line, and another database may need "ignore co-authorship" instead. With several entity kinds (people *and* companies), I would have to rewrite the group naming and probably the question itself. A person linking two companies is a different kind of statement than a company linking two companies, so I would expect bipartite projections there. At tens of thousands of nodes, exact betweenness and the per-node articulation check need approximation or sampling. Also, the CSVs would no longer be bundled: `NetworkLoader` takes any source with `{ schema, read(path) }`, so a fetch-based source from the backend drops in without touching the analysis.

## Trade-offs I made

- **Metrics in the browser, not in a build step.** The whole pipeline (CSV → clean → communities → metrics → layout) runs on page load in a few hundred milliseconds for about 180 nodes. Results are reproducible: Louvain and the layout use a seeded PRNG. At much larger sizes I'd move the analysis into a Web Worker.
- **Louvain rather than Leiden** because graphology ships it. Groups are named after their two best-connected members plus a dominant country/subsector, because "Group 3" means nothing to an analyst.
- **Groups as islands.** Each group is laid out in its own disc, and the discs are packed so that strongly linked groups sit next to each other. In the overview, the links between two groups are drawn as one line labelled with their count; individual cross-group links appear on hover, focus, group selection and in the answer. Each view has its own layout (the groups differ), computed the first time the view is shown; switching views animates the nodes to their new places.
- **One inlined HTML file (Vite + vite-plugin-singlefile)** instead of `fetch()`, so the page opens from the file system without a server.
- **Feature-Sliced Design + TypeScript classes.** `src/` is split into layers `app → pages → widgets → features → entities → shared`; a layer imports only from layers below it, and only through a slice's `index.ts`. Slices of one layer don't import each other: `analysis` describes what it needs from a network as its own `AnalyzableNetwork` interface. The `#layer/slice` aliases in `package.json` (mirrored in `tsconfig.json` paths) resolve to that `index.ts`.

## Where I used AI

Claude Code (Anthropic) was used as a pair programmer for:
- profiling the CSVs;
- discussing which metric answers the question for a non-technical reader;
- drafting the code and this README.

The approach, the decisions above and the final review of the code and text are mine.

## Files

| Path | What |
|---|---|
| `schema.json` | Dataset config: column mapping, filter views |
| `data/` | The two input CSVs, unchanged |
| `index.html`, `src/` | The viewer (source), Feature-Sliced Design, see below |
| `dist/index.html` | The built viewer, one self-contained file |

```
src/
  app/        App (composition root: source → Network → analysis → page), global styles
  pages/      graph-explorer: GraphExplorerPage, the sidebar + map layout
  widgets/    graph-canvas (Sigma renderer, group islands layer, highlight, node motion, camera), insight-panel (intro / answer / details),
              group-legend, data-notes
  features/   toggle-view, show-answer, focus-node, select-group, search-node
  entities/   network  - NetworkSchema, Organisation, Relationship/Link, Network, NetworkLoader (CSV cleaning)
              analysis - NetworkAnalyzer + AnalyzableNetwork (Louvain, cut-off, rare bridges, betweenness), AnalysisView, Group, GroupLayout (islands)
              session  - ExplorationSession: current view, focus, hover, selected group, answer mode, camera requests
  shared/     api (DataSource + schema.json types, bundled source), config (theme, layout), lib (Store, Signal, CsvParser, SeededRandom,
              GraphTopology, Text), ui (Component base class, Chip)
```
