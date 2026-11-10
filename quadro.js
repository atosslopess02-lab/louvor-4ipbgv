/* Quadro da escala: arraste o nome da pessoa até o dia (ou toque no nome e depois no dia).
   Usado no painel da 4ª IPB (admin.html) e no painel do administrador master (geral.html). */
(function () {
  const CSS = `
.qb{margin-top:10px}
.qb-ajuda{font-size:.85rem;color:var(--muted,#5d6f62);margin:0 0 8px}
.qb-pessoas{display:flex;flex-wrap:wrap;gap:6px;padding:10px;border:1px dashed var(--line,#d6e2d6);border-radius:12px;background:var(--soft,#eef4ee);position:sticky;top:56px;z-index:3}
.qb-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--line,#d6e2d6);font-size:.85rem;font-weight:700;cursor:grab;user-select:none;touch-action:manipulation}
.qb-chip small{font-weight:600;color:var(--muted,#5d6f62)}
.qb-chip.nr{opacity:.6;font-style:italic}
.qb-chip.sel{outline:3px solid var(--green,#4f7a5c)}
.qb-dias{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:10px}
.qb-dia{border:2px solid var(--line,#d6e2d6);border-radius:12px;padding:10px;min-height:120px;background:var(--surface,#fff);transition:border-color .15s,background .15s}
.qb-dia h4{margin:0;font-size:.95rem}
.qb-dia .disp{font-size:.75rem;color:var(--muted,#5d6f62);margin:2px 0 8px}
.qb-dia.pode{border-color:var(--green,#4f7a5c);background:color-mix(in srgb,var(--green,#4f7a5c) 8%,var(--surface,#fff))}
.qb-dia.naopode{opacity:.55}
.qb-dia.over{border-style:dashed;border-color:var(--green,#4f7a5c)}
.qb-it{display:flex;align-items:center;gap:4px;margin:4px 0;padding:4px 6px;border-radius:8px;background:var(--soft,#eef4ee);cursor:grab;font-size:.85rem}
.qb-it b{flex:1}
.qb-it select{font:inherit;font-size:.75rem;min-height:0;padding:2px 4px;border-radius:6px;max-width:110px}
.qb-it button{min-height:0;padding:0 6px;border:0;background:none;cursor:pointer;font-size:.9rem}
.qb-it.alerta b::after{content:" ⚠";color:#b8742a}
.qb-vazio{font-size:.8rem;color:var(--muted,#5d6f62)}`;
  function css() { if (document.getElementById('qb-css')) return; const s = document.createElement('style'); s.id = 'qb-css'; s.textContent = CSS; document.head.appendChild(s); }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fmt = d => { const [a, m, dd] = d.split('-').map(Number); return DIAS[new Date(a, m - 1, dd).getDay()] + ', ' + String(dd).padStart(2, '0') + '/' + String(m).padStart(2, '0'); };

  /* opts: datas [{data,rotulo}], pessoas [{nome, datas|null, funcoes}], funcoes [nomes], quadro {data:[{n,f}]}, onChange() */
  window.QuadroEscala = function (el, opts) {
    css();
    const Q = {}; (opts.datas || []).forEach(d => Q[d.data] = ((opts.quadro || {})[d.data] || []).map(x => ({ n: x.n, f: x.f || '' })));
    const pessoas = (opts.pessoas || []).slice().sort((a, b) => (b.datas ? 1 : 0) - (a.datas ? 1 : 0) || a.nome.localeCompare(b.nome, 'pt'));
    const pes = n => pessoas.find(p => p.nome === n);
    let sel = null; /* {n} ou {n, de, i} */
    const conta = n => Object.values(Q).reduce((s, l) => s + l.filter(x => x.n === n).length, 0);
    const pode = (n, d) => { const p = pes(n); return !p || !p.datas || p.datas.includes(d); };
    function desenha() {
      el.innerHTML = `<div class="qb">
        <p class="qb-ajuda">Segure o nome e arraste até o dia. No celular, toque no nome e depois toque no dia. Os dias em verde são os que a pessoa marcou. Arraste um nome de um dia para outro para trocar, ou toque em ✕ para tirar. ⚠ = a pessoa não marcou esse dia.</p>
        <div class="qb-pessoas">${pessoas.map(p => `<span class="qb-chip${p.datas ? '' : ' nr'}${sel && !sel.de && sel.n === p.nome ? ' sel' : ''}" draggable="true" data-n="${esc(p.nome)}" title="${p.datas ? 'Pode: ' + esc(p.datas.map(fmt).join(', ')) : 'Não respondeu o questionário'}">${esc(p.nome)} <small>${conta(p.nome) || ''}</small></span>`).join('') || '<span class="qb-vazio">Ninguém respondeu ainda.</span>'}</div>
        <div class="qb-dias">${(opts.datas || []).map(d => {
          const disp = pessoas.filter(p => p.datas && p.datas.includes(d.data)).map(p => p.nome.split(' ')[0]);
          return `<div class="qb-dia" data-d="${d.data}"><h4>${fmt(d.data)}</h4>${d.rotulo ? `<div class="disp">${esc(d.rotulo)}</div>` : ''}
            <div class="disp">Disponíveis (${disp.length}): ${esc(disp.join(', ')) || '—'}</div>
            ${(Q[d.data] || []).map((x, i) => { const fs = [...new Set([...((pes(x.n) || {}).funcoes || []), ...(opts.funcoes || [])])]; return `<div class="qb-it${pode(x.n, d.data) ? '' : ' alerta'}" draggable="true" data-d="${d.data}" data-i="${i}"><b>${esc(x.n)}</b><select data-d="${d.data}" data-i="${i}" aria-label="Função"><option value="">função</option>${fs.map(f => `<option${f === x.f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select><button type="button" data-rm="${d.data}|${i}" aria-label="Tirar">✕</button></div>`; }).join('') || '<div class="qb-vazio">Arraste nomes para cá</div>'}
          </div>`; }).join('')}</div></div>`;
      liga();
      if (sel) marca(sel.n);
    }
    const muda = () => { desenha(); opts.onChange && opts.onChange(); };
    function marca(n) { el.querySelectorAll('.qb-dia').forEach(c => { c.classList.toggle('pode', !!n && pode(n, c.dataset.d) && !!(pes(n) || {}).datas); c.classList.toggle('naopode', !!n && !pode(n, c.dataset.d)); }); }
    function solta(d) {
      if (!sel) return;
      const n = sel.n;
      if (sel.de) { const it = Q[sel.de].splice(sel.i, 1)[0]; if (!Q[d].some(x => x.n === n)) Q[d].push(it); }
      else if (!Q[d].some(x => x.n === n)) { const p = pes(n); const usadas = Q[d].map(x => x.f); const f = ((p && p.funcoes) || []).find(f => !usadas.includes(f)) || ((p && p.funcoes) || [])[0] || ''; Q[d].push({ n, f }); }
      sel = null; muda();
    }
    function liga() {
      el.querySelectorAll('.qb-chip').forEach(c => {
        c.ondragstart = e => { sel = { n: c.dataset.n }; e.dataTransfer.setData('text/plain', c.dataset.n); e.dataTransfer.effectAllowed = 'copyMove'; marca(sel.n); };
        c.ondragend = () => marca(null);
        c.onclick = () => { sel = sel && !sel.de && sel.n === c.dataset.n ? null : { n: c.dataset.n }; el.querySelectorAll('.qb-chip').forEach(x => x.classList.toggle('sel', !!sel && x === c)); marca(sel && sel.n); };
      });
      el.querySelectorAll('.qb-it').forEach(c => {
        c.ondragstart = e => { const d = c.dataset.d, i = +c.dataset.i; sel = { n: Q[d][i].n, de: d, i }; e.dataTransfer.setData('text/plain', sel.n); marca(sel.n); e.stopPropagation(); };
        c.ondragend = () => marca(null);
      });
      el.querySelectorAll('.qb-dia').forEach(col => {
        col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
        col.ondragleave = () => col.classList.remove('over');
        col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); solta(col.dataset.d); };
        col.onclick = e => { if (e.target.closest('select,button,.qb-it')) return; if (sel && !sel.de) solta(col.dataset.d); };
      });
      el.querySelectorAll('.qb-it select').forEach(s => s.onchange = () => { Q[s.dataset.d][+s.dataset.i].f = s.value; opts.onChange && opts.onChange(); });
      el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const [d, i] = b.dataset.rm.split('|'); Q[d].splice(+i, 1); muda(); });
    }
    desenha();
    return { get: () => JSON.parse(JSON.stringify(Q)) };
  };
})();
