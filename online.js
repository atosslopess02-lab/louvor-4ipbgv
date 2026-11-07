/* Junta ao site os repertórios que os administradores salvaram no painel (Firestore).
   Se o Firebase ainda não estiver configurado ou a internet falhar, o site usa só os dados fixos. */
window.carregaRepertoriosOnline = async function (DATA) {
  const C = (window.LOUVOR_CONFIG || {}).firebase || {};
  if (!C.projectId || !C.apiKey) return DATA;
  const url = `https://firestore.googleapis.com/v1/projects/${C.projectId}/databases/(default)/documents/repertorios?pageSize=300&key=${C.apiKey}`;
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' }); clearTimeout(tm);
    if (!r.ok) return DATA;
    const j = await r.json();
    const byTitle = {}; (DATA.musicas || []).forEach(m => byTitle[m.t] = m);
    DATA.repertorios = DATA.repertorios || {}; DATA.semana = DATA.semana || {};
    for (const doc of (j.documents || [])) {
      const date = doc.name.split('/').pop();
      let v; try { v = JSON.parse(doc.fields.json.stringValue); } catch (e) { continue; }
      if (!v || !Array.isArray(v.cultos)) continue;
      DATA.repertorios[date] = v.cultos;
      /* playlist do YouTube montada sozinha com os vídeos das músicas do domingo */
      const ids = [];
      v.cultos.forEach(c => c.itens.forEach(i => { const m = byTitle[i.t]; const id = m && (m.yt.match(/[?&]v=([\w-]{6,})/) || [])[1]; if (id && !ids.includes(id)) ids.push(id); }));
      const old = DATA.semana[date] || {};
      DATA.semana[date] = {
        sp: v.sp || old.sp || '',
        yt: v.yt || (ids.length ? 'https://www.youtube.com/watch_videos?video_ids=' + ids.join(',') : old.yt || '')
      };
    }
  } catch (e) { /* sem internet: segue com os dados fixos */ }
  return DATA;
};
