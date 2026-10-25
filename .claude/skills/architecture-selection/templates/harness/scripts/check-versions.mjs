#!/usr/bin/env node
// 初期構築時(と定期的な見直し時)に、使う道具と依存が最新の安定版かを確かめる。
//
// 調べるもの:
//   1. package.json の dependencies / devDependencies / peerDependencies(file: link: git などは除く)
//      - npm の dist-tags.latest(安定版)と比べる。指定がプレリリース(-alpha、-beta、-rc など)なら知らせる
//      - package.json の packageManager(pnpm@<版>)も調べる。書いていなければ知らせる
//   2. Node.js: .tool-versions / .nvmrc / .node-version / package.json の engines と、最新の LTS を比べる
//   3. GitHub Actions: .github/workflows/*.yml の uses: owner/repo@vN と、最新のリリースの major を比べる
//   4. shadcn のレジストリ: components.json の registries のうち GitHub Pages(<owner>.github.io/<repo>)のもの
//      - 版を固定した URL(/r/v<版>/)なら、そのリポジトリの最新のリリースと比べる。固定していなければ知らせる
//
// 使い方:
//   make check-versions                        # 結果を表で出す。古いものがあれば終了コード 1
//   make check-versions args="--json"          # JSON で出す
//   make check-versions args="--no-actions --no-node --no-registries"
//
// 環境変数:
//   NPM_REGISTRY   npm のレジストリ(既定は npm config の registry、なければ https://registry.npmjs.org)
//   NODE_DIST_URL  Node.js の版の一覧(既定は https://nodejs.org/dist/index.json)
//   GITHUB_API     GitHub の API(既定は https://api.github.com)
//   GITHUB_TOKEN   あれば GitHub の API に付ける(未認証は 1 時間 60 回まで)
//
// 依存のないスクリプトにしている(導入前の空のリポジトリでも動かすため)。Node.js 18 以上(fetch を使う)。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const results = [];

const npmRegistry = (() => {
  if (process.env.NPM_REGISTRY) return process.env.NPM_REGISTRY.replace(/\/$/, '');
  try {
    const r = execFileSync('npm', ['config', 'get', 'registry'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (r.startsWith('http')) return r.replace(/\/$/, '');
  } catch {}
  return 'https://registry.npmjs.org';
})();
const nodeDistUrl = process.env.NODE_DIST_URL || 'https://nodejs.org/dist/index.json';
const githubApi = (process.env.GITHUB_API || 'https://api.github.com').replace(/\/$/, '');

// ---- 版の比較(semver の範囲指定から下限の版を取り出して比べる) ----
function parse(v) {
  // "8341-ui@0.1.0" のようなタグは、@ の後ろを版として読む
  const at = String(v).lastIndexOf('@');
  if (at > 0) v = String(v).slice(at + 1);
  const m = String(v).match(/(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(-[0-9A-Za-z.-]+)?/);
  if (!m) return null;
  const n = (s) => (s === undefined || s === 'x' || s === '*' ? 0 : Number(s));
  return { major: n(m[1]), minor: n(m[2]), patch: n(m[3]), pre: m[4] || '' };
}
function cmp(a, b) {
  for (const k of ['major', 'minor', 'patch']) if (a[k] !== b[k]) return a[k] - b[k];
  if (a.pre && !b.pre) return -1;
  if (!a.pre && b.pre) return 1;
  return 0;
}
// 指定の範囲(^1.2.3、~1.2、>=1、1.x)が、最新の安定版を含むか
function rangeAllows(spec, latest) {
  const s = spec.trim();
  const want = parse(s);
  if (!want) return null;
  if (/^\^/.test(s)) return want.major === latest.major && (want.major > 0 || want.minor === latest.minor) && cmp(want, latest) <= 0;
  if (/^~/.test(s)) return want.major === latest.major && want.minor === latest.minor && cmp(want, latest) <= 0;
  if (/^>=/.test(s)) return cmp(want, latest) <= 0;
  if (/^\d+(\.(x|\*))?$/.test(s)) return want.major === latest.major;
  if (/^\d+\.\d+(\.(x|\*))?$/.test(s)) return want.major === latest.major && want.minor === latest.minor;
  return cmp(want, latest) === 0; // 完全一致の指定
}

function add(kind, name, current, latest, status, note = '') {
  results.push({ kind, name, current, latest, status, note });
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ---- 1. npm の依存 ----
function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}
function collectDeps() {
  const deps = new Map(); // name -> { spec, where }
  const put = (name, spec, where) => {
    if (typeof spec !== 'string') return;
    if (/^(workspace:|catalog:|file:|link:|git|github:|https?:|npm:)/.test(spec)) return;
    if (!deps.has(name)) deps.set(name, { spec, where });
  };
  // packageManager(例: pnpm@10.21.0+sha512.…)。+ 以降のハッシュは版の比較に使わない
  const rootPkg = readJson(join(root, 'package.json'));
  const pm = typeof rootPkg?.packageManager === 'string' && rootPkg.packageManager.match(/^(pnpm|npm|yarn)@([^+]+)/);
  if (pm) put(pm[1], pm[2], 'package.json の packageManager');
  // ワークスペースは使わないので、リポジトリ直下の package.json だけを読む
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(rootPkg?.[field] || {})) put(name, spec, 'package.json');
  }
  return deps;
}

async function checkNpm() {
  const deps = collectDeps();
  const pkg = readJson(join(root, 'package.json'));
  if (pkg && !pkg.packageManager) add('npm', 'packageManager', '(指定なし)', '?', 'missing', 'package.json に "packageManager": "pnpm@<版>" を書く(pnpm の版を CI と手元でそろえる)');
  const entries = [...deps.entries()];
  const limit = 8;
  for (let i = 0; i < entries.length; i += limit) {
    await Promise.all(entries.slice(i, i + limit).map(async ([name, { spec, where }]) => {
      try {
        const meta = await getJson(`${npmRegistry}/${name.replace('/', '%2F')}`, { accept: 'application/vnd.npm.install-v1+json' });
        const latestStr = meta['dist-tags']?.latest;
        if (!latestStr) return add('npm', name, spec, '?', 'unknown', 'dist-tags.latest がない');
        const latest = parse(latestStr);
        const want = parse(spec);
        if (want?.pre) {
          return add('npm', name, spec, latestStr, 'prerelease', `${where}。安定版ではない`);
        }
        const ok = rangeAllows(spec, latest);
        if (ok === null) return add('npm', name, spec, latestStr, 'unknown', `${where}。指定を読めない`);
        add('npm', name, spec, latestStr, ok ? 'ok' : 'outdated', where);
      } catch (e) {
        add('npm', name, spec, '?', 'error', `取得できない(${e.message})`);
      }
    }));
  }
}

// ---- 2. Node.js ----
function currentNodeSpec() {
  const tv = join(root, '.tool-versions');
  if (existsSync(tv)) {
    const m = readFileSync(tv, 'utf8').match(/^\s*(?:nodejs|node)\s+(\S+)/m);
    if (m) return { spec: m[1], where: '.tool-versions' };
  }
  for (const f of ['.nvmrc', '.node-version']) {
    if (existsSync(join(root, f))) return { spec: readFileSync(join(root, f), 'utf8').trim(), where: f };
  }
  const pkg = readJson(join(root, 'package.json'));
  const eng = pkg?.engines?.node || pkg?.devEngines?.runtime?.version;
  if (eng) return { spec: eng, where: 'package.json (engines)' };
  return null;
}

async function checkNode() {
  const cur = currentNodeSpec();
  try {
    const list = await getJson(nodeDistUrl);
    const lts = list.find((r) => r.lts);
    if (!lts) return add('node', 'Node.js', cur?.spec ?? '(指定なし)', '?', 'unknown', 'LTS が見つからない');
    const latest = parse(lts.version);
    const label = `${lts.version.replace(/^v/, '')} (LTS ${lts.lts})`;
    if (!cur) return add('node', 'Node.js', '(指定なし)', label, 'missing', '.tool-versions などで版を固定する');
    const spec = cur.spec.replace(/^v/, '').replace(/^lts\/\*$/, '');
    if (!spec) return add('node', 'Node.js', cur.spec, label, 'ok', `${cur.where}。常に最新の LTS`);
    const want = parse(spec);
    let status;
    if (/^lts\//i.test(spec)) status = spec.slice(4).toLowerCase() === String(lts.lts).toLowerCase() ? 'ok' : 'outdated';
    else if (/^[>^~]/.test(spec) || /^\d+(\.\d+)?(\.(x|\*))?$/.test(spec)) status = rangeAllows(spec, latest) ? 'ok' : 'outdated';
    else if (!want) status = 'unknown';
    else status = want.major === latest.major && cmp(want, latest) >= 0 ? 'ok' : 'outdated';
    add('node', 'Node.js', cur.spec, label, status, cur.where);
  } catch (e) {
    add('node', 'Node.js', cur?.spec ?? '(指定なし)', '?', 'error', `取得できない(${e.message})`);
  }
}

// ---- 3. GitHub Actions ----
async function checkActions() {
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(dir)) return;
  const uses = new Map(); // owner/repo -> { ref, file }
  for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/uses:\s*['"]?([\w.-]+\/[\w.-]+)(?:\/[^@\s'"]*)?@([^\s'"#]+)/g)) {
      if (!uses.has(m[1])) uses.set(m[1], { ref: m[2], file: f });
    }
  }
  const headers = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (const [repo, { ref, file }] of uses) {
    try {
      const rel = await getJson(`${githubApi}/repos/${repo}/releases/latest`, headers);
      const latestTag = rel.tag_name;
      const latest = parse(latestTag);
      const want = parse(ref);
      if (/^[0-9a-f]{40}$/.test(ref)) {
        add('action', repo, ref.slice(0, 12), latestTag, 'pinned', `${file}。コミットで固定している。最新のリリースと見比べる`);
        continue;
      }
      if (!latest || !want) {
        add('action', repo, ref, latestTag ?? '?', 'unknown', file);
        continue;
      }
      add('action', repo, ref, latestTag, want.major >= latest.major ? 'ok' : 'outdated', file);
    } catch (e) {
      add('action', repo, ref, '?', 'error', `${file}。取得できない(${e.message})`);
    }
  }
}

// ---- 4. shadcn のレジストリ ----
async function checkRegistries() {
  const cj = readJson(join(root, 'components.json'));
  const regs = cj?.registries;
  if (!regs || typeof regs !== 'object') return;
  const headers = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (const [ns, val] of Object.entries(regs)) {
    const url = typeof val === 'string' ? val : val?.url;
    const m = typeof url === 'string' && url.match(/^https:\/\/([\w-]+)\.github\.io\/([\w.-]+)\/r\/(?:v([^/]+)\/)?/);
    if (!m) continue;
    const [, owner, repo, ver] = m;
    try {
      const rel = await getJson(`${githubApi}/repos/${owner}/${repo}/releases/latest`, headers);
      const latest = parse(rel.tag_name);
      if (!ver) {
        add('registry', ns, '(版を固定していない)', rel.tag_name, 'missing', `components.json。URL を /r/v<版>/{name}.json にして固定する`);
        continue;
      }
      const want = parse(ver);
      add('registry', ns, `v${ver}`, rel.tag_name, want && latest && cmp(want, latest) >= 0 ? 'ok' : 'outdated', 'components.json');
    } catch (e) {
      add('registry', ns, ver ? `v${ver}` : '(版を固定していない)', '?', 'error', `components.json。${owner}/${repo} のリリースを取得できない(${e.message})`);
    }
  }
}

// ---- 実行 ----
const tasks = [checkNpm()];
if (!args.has('--no-node')) tasks.push(checkNode());
if (!args.has('--no-actions')) tasks.push(checkActions());
if (!args.has('--no-registries')) tasks.push(checkRegistries());
await Promise.all(tasks);

const order = { outdated: 0, prerelease: 1, missing: 2, error: 3, unknown: 4, pinned: 5, ok: 6 };
results.sort((a, b) => order[a.status] - order[b.status] || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
const labelMissing = (r) => (r.kind === 'registry' ? '版の固定なし' : '指定なし');

if (args.has('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const label = { ok: 'OK', outdated: '古い', prerelease: 'プレリリース', missing: '指定なし', error: '取得失敗', unknown: '判定不能', pinned: '固定' };
  console.log('| 状態 | 種類 | 名前 | 指定 | 最新の安定版 | 補足 |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const r of results) console.log(`| ${r.status === 'missing' ? labelMissing(r) : label[r.status]} | ${r.kind} | ${r.name} | ${r.current} | ${r.latest} | ${r.note} |`);
}

const bad = results.filter((r) => ['outdated', 'prerelease', 'missing'].includes(r.status));
const failed = results.filter((r) => r.status === 'error');
if (!args.has('--json')) {
  console.error(`\n古い・プレリリース・指定なし: ${bad.length} 件、取得できなかった: ${failed.length} 件`);
  if (failed.length) console.error('取得できなかったものは、公式の情報(npm、Node.js のリリース、各 Action とデザインシステムのリリース)で手で確かめる。');
}
process.exit(bad.length ? 1 : failed.length ? 2 : 0);
