/* Junta ao site os repertórios que os administradores salvaram no painel (Firestore)
   e o PDF de cifras gerado no montador para esses domingos.
   Se o Firebase não estiver configurado ou a internet falhar, o site usa só os dados fixos. */
(function () {
  const C = () => (window.LOUVOR_CONFIG || {}).firebase || {};
  const base = () => `https://firestore.googleapis.com/v1/projects/${C().projectId}/databases/(default)/documents`;
  const PEDACO = 700000; /* o Firestore aceita até ~1 MB por documento: o PDF vai em pedaços */

  async function getJSON(url, ms) {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), ms || 4000);
    try { const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' }); return r.ok ? await r.json() : null; }
    finally { clearTimeout(tm); }
  }

  window.carregaRepertoriosOnline = async function (DATA) {
    if (!C().projectId || !C().apiKey) return DATA;
    const key = '?pageSize=300&key=' + C().apiKey;
    /* escala ajustada no painel (coleção escalas/AAAA-MM-DD) */
    try {
      const e = await getJSON(base() + '/escalas' + key);
      const E = DATA.escala;
      const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const docs = ((e && e.documents) || []).map(d => { try { return { d: d.name.split('/').pop(), itens: JSON.parse(d.fields.json.stringValue).itens || [] }; } catch (x) { return null; } }).filter(Boolean);
      if (E && Array.isArray(E.domingos) && docs.length) {
        const hoje = new Date(), hojeS = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
        const mesFixo = (E.domingos[0] || '').slice(0, 7);
        /* se a escala fixa já passou e há escala salva de um mês seguinte, o site passa a mostrar esse mês */
        const prox = docs.map(x => x.d.slice(0, 7)).filter(m => m > mesFixo).sort()[0];
        if (prox && (E.domingos[E.domingos.length - 1] || '') < hojeS) {
          DATA.escala = { mes: MESES[+prox.slice(5) - 1] + ' de ' + prox.slice(0, 4), domingos: [], funcoes: E.funcoes.map(f => ({ f: f.f, nomes: [] })) };
        }
        const X = DATA.escala, mes = (X.domingos[0] || (prox || '')).slice(0, 7) || mesFixo;
        docs.filter(x => x.d.slice(0, 7) === mes).sort((a, b) => a.d.localeCompare(b.d)).forEach(({ d, itens }) => {
          let k = X.domingos.indexOf(d);
          if (k < 0) { X.domingos.push(d); X.domingos.sort(); k = X.domingos.indexOf(d); X.funcoes.forEach(f => f.nomes.splice(k, 0, '—')); }
          X.funcoes.forEach(f => f.nomes[k] = '—');
          itens.forEach(it => {
            let f = X.funcoes.find(x => x.f === it.f);
            if (!f) { f = { f: it.f, nomes: X.domingos.map(() => '—') }; X.funcoes.push(f); }
            f.nomes[k] = f.nomes[k] && f.nomes[k] !== '—' ? f.nomes[k] + ', ' + it.n : it.n;
          });
        });
      }
    } catch (x) {}
    try {
      const [j, p] = await Promise.all([getJSON(base() + '/repertorios' + key), getJSON(base() + '/pdfs' + key).catch(() => null)]);
      if (!j) return DATA;
      const byTitle = {}; (DATA.musicas || []).forEach(m => byTitle[m.t] = m);
      DATA.repertorios = DATA.repertorios || {}; DATA.semana = DATA.semana || {}; DATA.cifras = DATA.cifras || {};
      DATA.publicados = [];
      for (const doc of (j.documents || [])) {
        const date = doc.name.split('/').pop();
        let v; try { v = JSON.parse(doc.fields.json.stringValue); } catch (e) { continue; }
        if (!v || !Array.isArray(v.cultos)) continue;
        /* momentos marcados como "Sem música" no painel não aparecem no site */
        v.cultos = v.cultos.map(c => ({ culto: c.culto, itens: (c.itens || []).filter(i => !i.sem && i.t) })).filter(c => c.itens.length);
        DATA.repertorios[date] = v.cultos;
        DATA.publicados.push(date);
        /* playlist do YouTube montada sozinha com os vídeos das músicas do domingo */
        const ids = [];
        /* hinos: o vídeo vem do próprio item (o painel busca no YouTube ao salvar) */
        v.cultos.forEach(c => c.itens.forEach(i => { const m = byTitle[i.t]; const id = (m && m.yt) ? (m.yt.match(/[?&]v=([\w-]{6,})/) || [])[1] : i.yt; if (id && !ids.includes(id)) ids.push(id); }));
        const old = DATA.semana[date] || {};
        DATA.semana[date] = {
          titulo: 'Repertório – ' + date.split('-').reverse().slice(0, 2).join('/') + ' – 4ª IPB Governador Valadares',
          sp: v.sp || old.sp || '',
          yt: v.yt || (ids.length ? 'https://www.youtube.com/watch_videos?video_ids=' + ids.join(',') : old.yt || '')
        };
      }
      /* PDF de cifras gerado no montador para um domingo publicado */
      for (const doc of ((p && p.documents) || [])) {
        const date = doc.name.split('/').pop();
        const partes = +((doc.fields.partes || {}).integerValue || 0);
        if (partes > 0 && DATA.publicados.includes(date)) DATA.cifras[date] = { pdf: '#pdf-online=' + date, online: true };
      }
      /* questionário de disponibilidade aberto: aviso no topo da página inicial */
      const qj = await getJSON(base() + '/questionarios' + key).catch(() => null);
      const agora = Date.now();
      const MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      for (const doc of ((qj && qj.documents) || [])) {
        const f = doc.fields || {}, ab = Date.parse((f.abreTs || {}).timestampValue), fe = Date.parse((f.fechaTs || {}).timestampValue);
        if (ab <= agora && agora <= fe) {
          const mes = doc.name.split('/').pop(), fecha = (f.fecha || {}).stringValue || '';
          const alvo = document.getElementById('proximo');
          if (alvo && !document.getElementById('aviso-escala')) alvo.insertAdjacentHTML('beforebegin',
            `<a id="aviso-escala" href="escala.html" style="display:block;margin:18px 0 0;padding:14px 18px;border-radius:14px;background:#fff3d6;color:#5c3d00;border:2px solid #f0a020;text-decoration:none;font-weight:600">🗓️ <b>Escala de ${MES[+mes.slice(5, 7) - 1]}:</b> marque sua disponibilidade até ${fecha.split('-').reverse().slice(0, 2).join('/')} →</a>`);
          DATA.questionarioAberto = mes;
          break;
        }
      }
    } catch (e) { /* sem internet: segue com os dados fixos */ }
    return DATA;
  };

  /* guarda o PDF do montador no Firestore (só para domingos com repertório publicado) */
  window.publicaPdfOnline = async function (date, base64) {
    if (!C().projectId || !C().apiKey) throw new Error('sem config');
    const key = '?key=' + C().apiKey;
    const n = Math.ceil(base64.length / PEDACO);
    for (let i = 0; i < n; i++) {
      const r = await fetch(`${base()}/pdfs/${date}/partes/${i}${key}`, { method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: { d: { stringValue: base64.slice(i * PEDACO, (i + 1) * PEDACO) } } }) });
      if (!r.ok) throw new Error('parte ' + i + ': ' + r.status);
    }
    const r = await fetch(`${base()}/pdfs/${date}${key}`, { method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { partes: { integerValue: String(n) }, atualizado: { timestampValue: new Date().toISOString() } } }) });
    if (!r.ok) throw new Error('resumo: ' + r.status);
    return n;
  };

  /* clique em "Baixe todas as cifras em PDF" de um PDF guardado online */
  document.addEventListener('click', async e => {
    const a = e.target.closest && e.target.closest('a[href^="#pdf-online="]');
    if (!a) return;
    e.preventDefault();
    const date = a.getAttribute('href').split('=')[1];
    const txt = a.textContent; a.textContent = '⏳ Preparando o PDF…';
    try {
      const key = '?key=' + C().apiKey;
      const meta = await getJSON(`${base()}/pdfs/${date}${key}`, 15000);
      const n = +meta.fields.partes.integerValue;
      const partes = await Promise.all([...Array(n).keys()].map(i => getJSON(`${base()}/pdfs/${date}/partes/${i}${key}`, 30000)));
      const b64 = partes.map(p => p.fields.d.stringValue).join('');
      const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
      const l = document.createElement('a'); l.href = url; l.download = 'Cifras - ' + date.split('-').reverse().join('-') + '.pdf';
      document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { alert('Não consegui baixar o PDF agora. Tente de novo em instantes.'); }
    a.textContent = txt;
  }, true);
})();
