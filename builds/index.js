#!/usr/bin/env node
/* zipper-merge 0.0.1 - MIT */
import react, { createContext, useState, useContext, Children, useRef, useEffect, createElement } from 'react';
import { useStdout, useStdin, useInput, measureElement, Box, useApp, Text, useWindowSize, render } from 'ink';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import Link from 'ink-link';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { execFile as execFile$1 } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { promisify as promisify$1 } from 'node:util';

// Update selection and its derived file together, including after a Git refresh.
const selection = (state, index) => {
  const files = state.conflicts ?? [];
  const selected = Math.max(0, Math.min(index, files.length - 1));
  return { selected, selectedFile: files[selected] ?? null }
};

// Create one store per app instance so separate renders/tests never share state.
// Add future shared variables and actions here. Search prefixes stay local to UI.
const createAppStore = (initialState = {}) => createStore((set) => ({
  state: initialState,
  ...selection(initialState, 0),
  setState: (update) => set((current) => {
    const state = typeof update === 'function' ? update(current.state) : update;
    return { state, ...selection(state, current.selected) }
  }),
  setSelected: (update) => set((current) => {
    const index = typeof update === 'function' ? update(current.selected) : update;
    return selection(current.state, index)
  })
}));

const AppStateContext = createContext(null);

// Context carries a stable store reference; Zustand handles reactive updates.
const AppStateProvider = ({ initialState = {}, children }) => {
  const [store] = useState(() => createAppStore(initialState));

  return /*#__PURE__*/react.createElement(AppStateContext.Provider, { value: store }, children)
};

// Prefer selectors: useAppState((store) => store.selected).
// Without a selector, this subscribes to the full store for compatibility.
const useAppState = (selector) => {
  const store = useContext(AppStateContext);
  if (!store) throw new Error('useAppState must be used inside AppStateProvider')
  return useStore(store, selector)
};

// Ink removes the leading Escape before delivering an unknown CSI sequence.
const mouseReport = /^\[<(\d+);(\d+);(\d+)([Mm])$/;
const isMouseInput = (input) => mouseReport.test(input);

// Multiple mounted columns share terminal reporting without disabling each other.
const users = new WeakMap();

// Each direct child is a clickable item. onClick receives its zero-based index.
// Requires an alternate screen with no Static output above the live layout.
const ClickableColumn = ({ children, onClick, enabled = true, ...props }) => {
  const items = Children.toArray(children);
  const refs = useRef([]);
  const { stdout } = useStdout();
  const { isRawModeSupported } = useStdin();
  const active = Boolean(enabled && stdout.isTTY && isRawModeSupported);

  useEffect(() => {
    if (!active) return
    const count = users.get(stdout) ?? 0;
    if (count === 0) stdout.write('\u001b[?1000h\u001b[?1006h');
    users.set(stdout, count + 1);
    return () => {
      const remaining = users.get(stdout) - 1;
      if (remaining === 0) {
        stdout.write('\u001b[?1000l\u001b[?1006l');
        users.delete(stdout);
      } else {
        users.set(stdout, remaining);
      }
    }
  }, [stdout, active]);

  useInput((input) => {
    const mouse = mouseReport.exec(input);
    if (!mouse || mouse[1] !== '0' || mouse[4] !== 'M') return
    const x = Number(mouse[2]) - 1;
    const y = Number(mouse[3]) - 1;
    const index = items.findIndex((item, index) => {
      const node = refs.current[index];
      if (!node) return false
      const bounds = measureElement(node);
      return x >= bounds.x && x < bounds.x + bounds.width &&
        y >= bounds.y && y < bounds.y + bounds.height
    });
    if (index !== -1) onClick?.(index);
  }, { isActive: active });

  return (
    /*#__PURE__*/react.createElement(Box, Object.assign({}, props, { flexDirection: "column" }), items.map((child, index) => (
        /*#__PURE__*/react.createElement(Box,
          { key: child.key ?? index,
          ref: (node) => { refs.current[index] = node; },
          flexDirection: "column",
          flexShrink: 0 }, child)
      )))
  )
};

const Simple = function ({ clearPrompt, mouseEnabled = false }) {
  const state = useAppState((store) => store.state);
  const selected = useAppState((store) => store.selected);
  const setSelected = useAppState((store) => store.setSelected);
  const files = state.conflicts ?? [];
  const search = useRef({ prefix: '', updatedAt: 0 });
  const { exit } = useApp();
  const confirmSelection = (index) => {
    const file = files[index];
    if (!file) return
    setSelected(index);
    clearPrompt();
    exit(file.relative);
  };

  useInput((input, key) => {
    if (isMouseInput(input)) return // ClickableColumn handles mouse reports.
    if (key.escape) return // App handles Escape globally.
    if (key.ctrl && input === 'c') {
      exit(new Error('Selection cancelled'));
    } else if (key.upArrow) {
      search.current.prefix = '';
      setSelected((index) => (index - 1 + files.length) % files.length);
    } else if (key.downArrow) {
      search.current.prefix = '';
      setSelected((index) => (index + 1) % files.length);
    } else if (key.return) {
      confirmSelection(selected);
    } else if (input && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(input)) {
      const now = Date.now();
      const prefix = now - search.current.updatedAt > 700 ? '' : search.current.prefix;
      search.current = { prefix: prefix + input.toLowerCase(), updatedAt: now };
      const match = files.findIndex((choice) =>
        choice.relative.toLowerCase().startsWith(search.current.prefix)
      );
      if (match !== -1) {
        setSelected(match);
      }
    }
  });
  return (
    /*#__PURE__*/react.createElement(Box, { flexDirection: "column", paddingTop: 2, paddingBottom: 2, paddingLeft: '2%' }, /*#__PURE__*/react.createElement(Box, { flexDirection: "row", alignItems: "center", justifyContent: "start" }, /*#__PURE__*/react.createElement(Text, { color: "red", dim: true }, files.length + ' Files'), /*#__PURE__*/react.createElement(Text, { bold: true }, " to resolve:")), /*#__PURE__*/react.createElement(ClickableColumn,
        { enabled: mouseEnabled,
        onClick: (index) => {
          search.current.prefix = '';
          confirmSelection(index);
        },
        borderTop: false,
        borderLeft: true,
        borderStyle: "single",
        borderBottom: false,
        borderRight: false,
        borderColor: "gray",
        paddingLeft: 1,
        paddingTop: 1 }, files.map((choice, index) => (
          /*#__PURE__*/react.createElement(Box,
            { key: choice.relative,
            flexDirection: "row",
            alignItems: "start",
            justifyContent: "start",
            gap: 2,
            paddingLeft: 1,
            minHeight: 2 }, /*#__PURE__*/react.createElement(Text, { color: index === selected ? 'cyan' : undefined }, index === selected ? '●' : '○'), /*#__PURE__*/react.createElement(Box, { flexDirection: "col", height: 3 }, /*#__PURE__*/react.createElement(Box, { flexDirection: "row", justifyContent: "start" }, /*#__PURE__*/react.createElement(Text, { color: "red", underline: true, bold: index === selected }, "./", choice.relative), /*#__PURE__*/react.createElement(Text, { dimColor: index !== selected, color: "white" }, ' ❯')), /*#__PURE__*/react.createElement(Box, { flexDirection: "row", justifyContent: "start", paddingLeft: 3 }, /*#__PURE__*/react.createElement(Text, { color: "white", dimColor: true }, "╰─"), /*#__PURE__*/react.createElement(Text, { color: "white", dimColor: index !== selected }, ' ' + choice.conflicts.length, ' '), /*#__PURE__*/react.createElement(Text, { color: "white", dimColor: index !== selected }, choice.conflicts.length === 1 ? 'conflict' : 'conflicts'))))
        ))), /*#__PURE__*/react.createElement(Text, { dimColor: true }, selected))
  )
};

var version = '0.0.1';

const Banner = function () {
  return (
    /*#__PURE__*/react.createElement(Box, { flexDirection: "row", gap: 1, justifyContent: "start", maxHeight: 3 }, /*#__PURE__*/react.createElement(Box, { paddingX: 1, paddingY: 0, alignSelf: "flex-start" }, /*#__PURE__*/react.createElement(Link, { url: "https://github.com/spencermountain/zipper-merge" }, /*#__PURE__*/react.createElement(Text, { color: "green", bold: true, underline: true, wrap: "truncate" }, "zipper-merge"))), /*#__PURE__*/react.createElement(Text, { color: "grey", dim: true }, "v", version))
  )
};

const StatusBox = function () {
  const state = useAppState((store) => store.state);
  const { repoName } = state;
  const incomingName = state.branches.incoming
    .map((branch) => {
      return branch.branches.join(' ')
    })
    .join(' / ');
  return (
    /*#__PURE__*/react.createElement(Box,
      { flexDirection: "column",
      alignSelf: "start",
      marginLeft: '5%',
      width: "30",
      flexShrink: 1,
      maxHeight: "16",
      borderStyle: "round",
      borderColor: "grey",
      backgroundDimColor: "red" }, /*#__PURE__*/react.createElement(Box, { alignSelf: "start", paddingLeft: 1 }, /*#__PURE__*/react.createElement(Text, { color: "yellow" }, " ", repoName), /*#__PURE__*/react.createElement(Text, { color: "cyan" }, " ", '/' + state.branches.current)), /*#__PURE__*/react.createElement(Box, { alignSelf: "start", padding: 1, italic: true }, /*#__PURE__*/react.createElement(Text, { color: "yellow", bold: true }, ' ↯ '), /*#__PURE__*/react.createElement(Text, { color: "whiteDim" }, "Currently in a merge conflict")), /*#__PURE__*/react.createElement(Box,
        { flexDirection: "row",
        alignSelf: "end",
        justifyContent: "flex-end",
        width: "100%",
        paddingRight: 1 }, /*#__PURE__*/react.createElement(Text, { color: "magenta", dim: true }, ' ↯ ', incomingName)))
  )
};

const Footer = () => {
  useAppState((store) => store.selected);
  const conflicts = useAppState((store) => store.state.conflicts?.length ?? 0);
  let message = '';
  if (conflicts > 0) {
    message = ` ${conflicts} file${conflicts > 1 ? 's' : ''} to resolve before continuing`;
  } else {
    message = 'Esc exit';
  }
  return (
    /*#__PURE__*/react.createElement(Box, { height: 1, flexShrink: 0, paddingX: 1, overflow: "hidden" }, /*#__PURE__*/react.createElement(Text, { dimColor: true, wrap: "truncate-end" }, "⟫⟫", message))
  )
};

const AppContent = function ({ clearPrompt, mouseEnabled }) {
  const state = useAppState((store) => store.state);
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { rows } = useWindowSize();
  useInput(
    (input, key) => {
      if (key.escape) {
        clearPrompt?.();
        exit();
      }
    },
    { isActive: isRawModeSupported }
  );
  const { conflicts: files = [] } = state;
  return (
    /*#__PURE__*/react.createElement(Box, { width: "100%", maxHeight: mouseEnabled ? rows : undefined, overflow: "hidden", flexDirection: "column" }, /*#__PURE__*/react.createElement(Box, { flexDirection: "column", flexGrow: 1, flexShrink: 1, minHeight: 0, overflow: "hidden" }, /*#__PURE__*/react.createElement(Banner, null), files.length > 0 ? (
          /*#__PURE__*/react.createElement(Box, { flexDirection: "column", padding: 1 }, /*#__PURE__*/react.createElement(StatusBox, null), /*#__PURE__*/react.createElement(Simple, { clearPrompt: clearPrompt, mouseEnabled: mouseEnabled }))
        ) : (
          /*#__PURE__*/react.createElement(Text, null, "No merge conflicts found.")
        )), /*#__PURE__*/react.createElement(Footer, null))
  )
};

const App = ({ state, clearPrompt, mouseEnabled = false }) => (
  /*#__PURE__*/react.createElement(AppStateProvider, { initialState: state }, /*#__PURE__*/react.createElement(AppContent, { clearPrompt: clearPrompt, mouseEnabled: mouseEnabled }))
);

const runFile$3 = promisify(execFile);

const checkGitInstalled = async (options = {}) => {
  try {
    await runFile$3('git', ['--version'], options);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Git is not installed or is not available on PATH.')
    }
    throw new Error(`Unable to run Git: ${error.message}`)
  }
};

const checkGitRepository = async (options = {}) => {
  let stdout;
  try {
    const result = await runFile$3('git', ['rev-parse', '--is-inside-work-tree'], options);
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `Run zipper-merge inside an accessible Git working tree. ${error.stderr?.trim() || error.message}`
    )
  }
  if (stdout.trim() !== 'true') {
    throw new Error(
      'Run zipper-merge inside a Git working tree, not a bare repository or .git directory.'
    )
  }
};

const checkGitBranch = async (options = {}) => {
  try {
    const { stdout } = await runFile$3('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], options);
    return stdout.trim()
  } catch (error) {
    if (error.code === 1) {
      throw new Error('HEAD is detached. Switch to a Git branch before running zipper-merge.')
    }
    throw new Error(
      `Unable to determine the current Git branch: ${error.stderr?.trim() || error.message}`
    )
  }
};

const checkInteractiveTerminal = (stdin = process.stdin, stdout = process.stdout) => {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      'File selection requires an interactive terminal. Run zipper-merge without piping input or output.'
    )
  }
};

const checkGitEnvironment = async (options = {}) => {
  await checkGitInstalled(options);
  await checkGitRepository(options);
  return checkGitBranch(options)
};

// Markers must occupy a whole line. Labels follow a space or tab; the separator
// has no label. Longer runs support Git's custom conflict-marker-size setting.
const readMarker = (line) => {
  const match = /^(<{7,}|\|{7,}|={7,}|>{7,})(?:[ \t](.*))?$/.exec(line);
  if (!match || (match[1][0] === '=' && match[2] !== undefined)) return null
  return { kind: match[1][0], size: match[1].length, label: match[2] ?? '' }
};

/**
 * Split a conflicted file into ordered text and conflict sections.
 *
 * Each section includes its original `text`, inclusive 1-based line numbers,
 * and UTF-16 string offsets (start inclusive, end exclusive). Concatenating
 * section.text reproduces the input exactly, including CRLF and missing EOF LF.
 * Conflicts also contain ours/theirs { label, text }, an optional base, and
 * markerSize. Supports merge, diff3, and zdiff3 layouts with markers >= 7 chars.
 *
 * An opening marker starts a strict state machine: malformed or incomplete
 * conflicts throw SyntaxError with a lineNumber. Other markers outside a
 * conflict remain ordinary text (for example a line of equals signs).
 */
const parseConflicts = (text) => {
  if (typeof text !== 'string') throw new TypeError('Expected file contents as a string')
  const sections = [];
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let offset = 0;
  let plainStart = 0;
  let plainLine = 1;
  let conflict = null;
  let side = null;

  const fail = (message, lineNumber) => {
    const error = new SyntaxError(`${message} at line ${lineNumber}`);
    error.lineNumber = lineNumber;
    throw error
  };
  const addText = (endOffset, endLine) => {
    if (endOffset > plainStart) {
      sections.push({
        type: 'text', startLine: plainLine, endLine,
        startOffset: plainStart, endOffset, text: text.slice(plainStart, endOffset)
      });
    }
  };

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const marker = readMarker(line.replace(/\r?\n$/, ''));
    const endOffset = offset + line.length;

    if (!conflict) {
      if (marker?.kind === '<') {
        addText(offset, lineNumber - 1);
        conflict = {
          type: 'conflict', startLine: lineNumber, startOffset: offset,
          markerSize: marker.size,
          ours: { label: marker.label, text: '' }, base: null,
          theirs: { label: '', text: '' }
        };
        side = 'ours';
      }
    } else if (!marker) {
      conflict[side].text += line;
    } else {
      if (marker.size !== conflict.markerSize) fail('Mismatched conflict marker length', lineNumber);
      if (marker.kind === '|' && side === 'ours') {
        conflict.base = { label: marker.label, text: '' };
        side = 'base';
      } else if (marker.kind === '=' && (side === 'ours' || side === 'base')) {
        side = 'theirs';
      } else if (marker.kind === '>' && side === 'theirs') {
        conflict.theirs.label = marker.label;
        sections.push({
          ...conflict, endLine: lineNumber, endOffset,
          text: text.slice(conflict.startOffset, endOffset)
        });
        conflict = null;
        side = null;
        plainStart = endOffset;
        plainLine = lineNumber + 1;
      } else {
        fail(`Unexpected ${marker.kind.repeat(marker.size)} marker`, lineNumber);
      }
    }
    offset = endOffset;
  }

  if (conflict) fail('Unterminated conflict starting', conflict.startLine);
  addText(text.length, lines.length);
  return sections
};

const runFile$2 = promisify$1(execFile$1);
// Each file includes its basename (filename), repo-relative path (relative),
// and full working-tree path (absolute). Files stay listed until staged, even
// after all markers are resolved. Per-file failures
// have empty arrays and error details; failures running Git reject the call.
const getConflicts = async (options = {}) => {
  const { stdout: rootOutput } = await runFile$2('git', ['rev-parse', '--show-toplevel'], options);
  const root = rootOutput.replace(/\r?\n$/, '');
  const { stdout } = await runFile$2(
    'git',
    ['diff', '--no-relative', '--name-only', '--diff-filter=U', '-z'],
    options
  );
  const files = stdout.split('\0').filter(Boolean);
  const entries = await Promise.all(
    files.map(async (file) => {
      const paths = { filename: basename(file), relative: file, absolute: join(root, file) };
      try {
        // Unmerged entries can be deleted files or symlinks, not just text files.
        // Do not follow a conflicted symlink and read an unrelated target.
        if (!(await lstat(paths.absolute)).isFile()) throw new Error('Not a regular file')
        const contents = await readFile(paths.absolute);
        if (contents.includes(0)) throw new Error('Binary file cannot be parsed as text')
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(contents);
        const sections = parseConflicts(text);
        return {
          ...paths,
          sections,
          conflicts: sections.filter((section) => section.type === 'conflict'),
          error: null
        }
      } catch (error) {
        // One unreadable or malformed file must not hide the other unmerged files.
        return {
          ...paths,
          sections: [],
          conflicts: [],
          error: {
            message: error.message,
            code: error.code ?? null,
            lineNumber: error.lineNumber ?? null
          }
        }
      }
    })
  );
  return entries
};

const runFile$1 = promisify$1(execFile$1);
// Git records incoming commits, not necessarily the branch names used to start
// an operation. Return every local branch whose tip matches, rather than guess.
// `current` is null for detached HEAD; `rebasing` names the branch being rebased.
const getBranches = async (options = {}) => {
  const git = async (...args) => {
    const { stdout } = await runFile$1('git', args, options);
    return stdout.trim()
  };
  const optionalRef = async (...args) => {
    try {
      return await git(...args)
    } catch (error) {
      if (error.code === 1) return null
      throw error
    }
  };
  // --git-path resolves metadata correctly in linked worktrees as well.
  const metadata = async (name) => {
    const path = await git('rev-parse', '--path-format=absolute', '--git-path', name);
    try {
      return (await readFile(path, 'utf8')).trim()
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  };

  const current = await optionalRef('symbolic-ref', '--quiet', '--short', 'HEAD');
  const rebaseHead =
    (await metadata('rebase-merge/head-name')) ?? (await metadata('rebase-apply/head-name'));
  const mergeHeads = await metadata('MERGE_HEAD');
  const cherryPickHead = await optionalRef('rev-parse', '--verify', '--quiet', 'CHERRY_PICK_HEAD');
  let operation = null;
  let commits = [];
  if (rebaseHead !== null) {
    operation = 'rebase';
    const commit = await optionalRef('rev-parse', '--verify', '--quiet', 'REBASE_HEAD');
    if (commit) commits = [commit];
  } else if (mergeHeads) {
    operation = 'merge';
    commits = mergeHeads.split(/\s+/);
  } else if (cherryPickHead) {
    operation = 'cherry-pick';
    commits = [cherryPickHead];
  }
  const incoming = await Promise.all(
    commits.map(async (commit) => {
      const refs = await git(
        'for-each-ref',
        `--points-at=${commit}`,
        '--format=%(refname)',
        'refs/heads/'
      );
      const branches = refs
        .split('\n')
        .filter(Boolean)
        .map((ref) => ref.slice('refs/heads/'.length));
      return { commit, branches }
    })
  );
  const rebasing = rebaseHead?.startsWith('refs/heads/')
    ? rebaseHead.slice('refs/heads/'.length)
    : null;
  return { current, operation, incoming, rebasing }
};

const runFile = promisify$1(execFile$1);


// Use the working tree's root name, even when called from a nested directory.
// This works for local repositories without a remote; Git errors propagate.
const getRepoName = async (options = {}) => {
  const { stdout } = await runFile('git', ['rev-parse', '--show-toplevel'], options);
  return basename(stdout.replace(/\r?\n$/, ''))
};

const getState = async (options = {}) => {
  const conflicts = await getConflicts(options);
  const repoName = await getRepoName(options);
  const branches = await getBranches(options);
  return { conflicts, repoName, branches }
};

try {
  await checkGitEnvironment();
  const state = await getState();
  if (state.conflicts.length === 0) {
    console.log('No merge conflicts found.');
  } else {
    checkInteractiveTerminal();
    const app = render(
      createElement(App, { state, clearPrompt: () => app.clear(), mouseEnabled: true }),
      { alternateScreen: true }
    );
  }
} catch (error) {
  console.error(`zipper-merge: ${error.message}`);
  process.exitCode = 1;
}
