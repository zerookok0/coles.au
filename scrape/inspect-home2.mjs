/** Inventory the archived homepage content model: component types + fields. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const url = 'https://web.archive.org/web/2024id_/https://www.coles.com.au/';
const html = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
const json = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)[1]);

const nodes = [];
(function walk(node, path) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
    return;
  }
  if (node[':type']) nodes.push({ path, type: node[':type'], node });
  for (const k of Object.keys(node)) {
    if (k.startsWith(':') && k !== ':items' && k !== ':type') continue;
    walk(node[k], `${path}.${k}`);
  }
})(json.props.pageProps.data, 'data');

console.log('components:', nodes.length);
const byType = new Map();
for (const n of nodes) {
  if (!byType.has(n.type)) byType.set(n.type, []);
  byType.get(n.type).push(n);
}
for (const [type, list] of byType) {
  console.log(`\n=== ${type} (${list.length}) ===`);
  const sample = list[0].node;
  console.log('fields:', Object.keys(sample).filter((k) => !k.startsWith(':')).join(', '));
  const text = JSON.stringify(sample).slice(0, 900);
  console.log('sample:', text);
}
