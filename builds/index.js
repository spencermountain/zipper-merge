#!/usr/bin/env node
/* zipper-merge 0.0.1 - MIT */
import react, { useState, useRef, createElement } from 'react';
import { useApp, useInput, Text, Box, render } from 'ink';
import Link from 'ink-link';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { execFile as execFile$1 } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { promisify as promisify$1 } from 'node:util';

const Simple = function ({ title, description, choices, clearPrompt }) {
  const [selected, setSelected] = useState(0);
  const search = useRef({ prefix: '', updatedAt: 0 });
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit(new Error('Selection cancelled'));
    } else if (key.upArrow) {
      search.current.prefix = '';
      setSelected((index) => (index - 1 + choices.length) % choices.length);
    } else if (key.downArrow) {
      search.current.prefix = '';
      setSelected((index) => (index + 1) % choices.length);
    } else if (key.return) {
      clearPrompt();
      exit(choices[selected].id);
    } else if (input && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(input)) {
      const now = Date.now();
      const prefix = now - search.current.updatedAt > 700 ? '' : search.current.prefix;
      search.current = { prefix: prefix + input.toLowerCase(), updatedAt: now };
      const match = choices.findIndex((choice) =>
        choice.label.toLowerCase().startsWith(search.current.prefix)
      );
      if (match !== -1) setSelected(match);
    }
  });

  return (
    /*#__PURE__*/react.createElement(Box, { flexDirection: "column", paddingTop: 2, paddingBottom: 2, paddingLeft: 1 }, /*#__PURE__*/react.createElement(Box, { flexDirection: "row", alignItems: "center", justifyContent: "start", gap: 3 }, /*#__PURE__*/react.createElement(Text, { bold: true }, title || ''), /*#__PURE__*/react.createElement(Text, { dimColor: true }, description || '')), /*#__PURE__*/react.createElement(Box,
        { flexDirection: "column",
        borderTop: false,
        borderBottom: false,
        borderRight: false,
        borderColor: "gray",
        paddingLeft: 1 }, choices.map((choice, index) => (
          /*#__PURE__*/react.createElement(Text, { key: choice.id, color: index === selected ? 'cyan' : undefined }, /*#__PURE__*/react.createElement(Text, { bold: true, color: "red" }, `${index === selected ? '●' : '○'} ${choice.label}`), choice.description && /*#__PURE__*/react.createElement(Text, { dimColor: true }, ` — ${choice.description}`))
        ))))
  )
};

var version = '0.0.1';

const Banner = function () {
  return (
    /*#__PURE__*/react.createElement(Box, { flexDirection: "row", gap: 1, justifyContent: "space-between", width: "100%", maxHeight: 3 }, /*#__PURE__*/react.createElement(Box, { paddingX: 1, paddingY: 0, alignSelf: "flex-start" }, /*#__PURE__*/react.createElement(Link, { url: "https://github.com/spencermountain/zipper-merge" }, /*#__PURE__*/react.createElement(Text, { color: "green", bold: true, underline: true, wrap: "truncate" }, "zipper-merge"))), /*#__PURE__*/react.createElement(Text, { color: "grey", dim: true }, "v", version))
  )
};

const StatusBox = function ({ state }) {
  const { repoName } = state;
  console.log(state);
  return (
    /*#__PURE__*/react.createElement(Box,
      { flexDirection: "column",
      alignSelf: "start",
      marginLeft: '15%',
      width: "30",
      flexShrink: 1,
      minHeight: "30",
      borderStyle: "round",
      borderColor: "grey",
      backgroundDimColor: "red" }, /*#__PURE__*/react.createElement(Box, { alignSelf: "start" }, /*#__PURE__*/react.createElement(Text, { color: "yellow" }, " ", repoName), /*#__PURE__*/react.createElement(Text, { color: "cyan" }, " ", '/' + state.branches.current)), /*#__PURE__*/react.createElement(Box, { alignSelf: "center", padding: 1 }, /*#__PURE__*/react.createElement(Text, { color: "magenta" }, " 🎈 Currently in a merge conflict")))
  )
};

const App = function ({ state = {}, clearPrompt }) {
  const { conflicts = {} } = state;
  const files = Object.keys(conflicts);
  return (
    /*#__PURE__*/react.createElement(Box, { width: "100%", overflow: "hidden", flexDirection: "column" }, /*#__PURE__*/react.createElement(Banner, null), files.length > 0 ? (
        /*#__PURE__*/react.createElement(Box, { flexDirection: "column", padding: 1 }, /*#__PURE__*/react.createElement(StatusBox, { state: state }), /*#__PURE__*/react.createElement(Simple,
            { title: `${files.length} Current Files with conflicts`,
            description: "Use ↑/↓ to choose a file, then press Enter",
            choices: files.map((file) => ({
              id: file,
              label: file,
              description: conflicts[file].error?.message
            })),
            clearPrompt: clearPrompt }))
      ) : (
        /*#__PURE__*/react.createElement(Text, null, "No merge conflicts found.")
      ))
  )
};

const runFile$1 = promisify(execFile);

const checkGitInstalled = async (options = {}) => {
  try {
    await runFile$1('git', ['--version'], options);
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
    const result = await runFile$1('git', ['rev-parse', '--is-inside-work-tree'], options);
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
    const { stdout } = await runFile$1('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], options);
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
  checkInteractiveTerminal();
  return await checkGitBranch(options)
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

const runFile = promisify$1(execFile$1);

// Map repo-relative filenames to { sections, conflicts, error }. Files stay in
// the map until staged, even after all markers are resolved. Per-file failures
// have empty arrays and error details; failures running Git reject the call.
const getConflicts = async (options = {}) => {
  const { stdout: rootOutput } = await runFile('git', ['rev-parse', '--show-toplevel'], options);
  const root = rootOutput.replace(/\r?\n$/, '');
  const { stdout } = await runFile(
    'git', ['diff', '--no-relative', '--name-only', '--diff-filter=U', '-z'], options
  );
  const files = stdout.split('\0').filter(Boolean);
  const entries = await Promise.all(files.map(async (file) => {
    try {
      const path = join(root, file);
      // Unmerged entries can be deleted files or symlinks, not just text files.
      // Do not follow a conflicted symlink and read an unrelated target.
      if (!(await lstat(path)).isFile()) throw new Error('Not a regular file')
      const contents = await readFile(path);
      if (contents.includes(0)) throw new Error('Binary file cannot be parsed as text')
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(contents);
      const sections = parseConflicts(text);
      return [file, {
        sections,
        conflicts: sections.filter((section) => section.type === 'conflict'),
        error: null
      }]
    } catch (error) {
      // One unreadable or malformed file must not hide the other unmerged files.
      return [file, {
        sections: [], conflicts: [],
        error: { message: error.message, code: error.code ?? null, lineNumber: error.lineNumber ?? null }
      }]
    }
  }));
  return Object.fromEntries(entries)
};

// Use the working tree's root name, even when called from a nested directory.
// This works for local repositories without a remote; Git errors propagate.
const getRepoName = async (options = {}) => {
  const { stdout } = await runFile('git', ['rev-parse', '--show-toplevel'], options);
  return basename(stdout.replace(/\r?\n$/, ''))
};

// Git records incoming commits, not necessarily the branch names used to start
// an operation. Return every local branch whose tip matches, rather than guess.
// `current` is null for detached HEAD; `rebasing` names the branch being rebased.
const getBranchNames = async (options = {}) => {
  const git = async (...args) => {
    const { stdout } = await runFile('git', args, options);
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

const getState = async (options = {}) => {
  const conflicts = await getConflicts(options);
  const repoName = await getRepoName(options);
  const branches = await getBranchNames(options);
  return { conflicts, repoName, branches }
};

try {
  await checkGitEnvironment();
  const state = await getState();
  if (Object.keys(state.conflicts).length === 0) {
    console.log('No conflicts found.');
    process.exitCode = 0;
  }
  const app = render(createElement(App, { state, clearPrompt: () => app.clear() }));
} catch (error) {
  console.error(`zipper-merge: ${error.message}`);
  process.exitCode = 1;
}
