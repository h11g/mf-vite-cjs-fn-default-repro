async function main() {
  const out = document.getElementById('out')!;

  // Wait until the federation runtime has finished seeding the share cache.
  // Without this the repro would be ambiguous: a CommonJS module that evaluates
  // before bootstrap also sees `undefined`, which throws the same TypeError.
  // Everything below runs with the share cache already populated.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const cache = (globalThis as Record<string, any>).__mf_module_cache__;
  const share = cache?.share ?? {};
  const key = Object.keys(share).find((k) => k.startsWith('default:cjs-fn-default'));
  const entry = key ? share[key] : undefined;

  const lines = [
    `share cache key    : ${key ?? '<missing>'}`,
    `share cache value  : ${typeof entry}` +
      (entry && typeof entry === 'object' ? ` { ${Object.keys(entry).join(', ')} }` : ''),
    `  .default         : ${entry ? typeof entry.default : '-'}`,
    `  .SOME_ENUM       : ${entry ? typeof entry.SOME_ENUM : '-'}`,
  ];

  // Imported dynamically so the CommonJS consumer evaluates *after* the wait.
  const { probe } = await import('cjs-fn-default-consumer');

  try {
    lines.push(`probe()            : OK ${JSON.stringify(probe())}`);
  } catch (error) {
    lines.push(`probe()            : THREW ${error}`);
  }

  const text = lines.join('\n');
  out.textContent = text;
  console.log(text);
}

void main();
