# zipper-merge
experimental CLI tool to help with merge conflicts

Requires Node.js 22 or newer and Git. Run `zipper-merge` from a Git working tree
on a branch. Conflicted files appear in an interactive selector; use the arrow
keys and Enter to select a file. This currently lists conflicts; it does not
resolve them.

Development:

```sh
pnpm install
npm run dev
npm run watch
```

Build and check the npm package:

```sh
npm test
npm pack
```

Rollup compiles the CLI and JSX into `builds/index.js`. `npm pack` rebuilds it
automatically. The package ships this compiled entry with Ink and React as
runtime dependencies; `tsx` is only used during development. Type declarations
are not included yet.

Install a locally packed release with `npm install -g ./zipper-merge-0.0.1.tgz`,
then run `zipper-merge` inside the repository you want to inspect.

Try real Git conflicts in a disposable, ignored `dummy/` repository:

```sh
pnpm conflict:simple      # Merge conflict in menu.txt
pnpm conflict:multi       # Merge conflicts in three files, including a spaced filename
pnpm conflict:multi-step  # Two cherry-picked commits, each stopping at a different file
pnpm conflict:clean       # Clean repository with no conflicts
```

Each command deletes and recreates the same dummy, including any edits made
there. It refuses to overwrite an existing folder without its dummy marker.
The main checkout's Git state is unaffected.

After creating a scenario, run `pnpm --dir dummy dev`, or:

```sh
cd dummy
pnpm dev
git status
```

The dummy's launcher imports the unbuilt source from this checkout. Changes
to `src/` are available on the next run; `pnpm watch` inside the dummy restarts
on source changes. No package installation or build is needed in the dummy.

For `multi-step`, resolve `menu.txt`, stage it, and run
`git -c core.editor=true cherry-pick --continue`. The second commit then conflicts
in `config/settings.json`; resolve and stage that file and continue again. Both
steps remain on `main`. Use `git cherry-pick --abort` to cancel. The merge scenarios
can be completed with `git add . && git -c core.editor=true merge --continue` after
resolving the files, or cancelled with `git merge --abort`.

Run another `conflict:*` command from the parent checkout to reset the dummy.

The examples live in `scripts/examples/`. Read `simple.js`, `multi.js`,
`multi-step.js`, or `clean.js` to see the exact edits on each branch. Comments
explain why those edits conflict. Shared reset, Git, and source-launcher helpers
live in `lib.js`; `index.js` selects the scenario and prints usage instructions.
