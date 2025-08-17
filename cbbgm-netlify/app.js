// College Basketball GM (Personal) - Single-file SPA
// Simple fictional CBB simulation with local + cloud persistence (Netlify Blobs via Functions).

const state = {
  league: null, // active league object
  view: "dashboard",
};

// ---------- Utilities ----------
const rand = (min, max) => Math.random() * (max - min) + min;
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const gaussian = (mean=0, std=1) => {
  // Box-Muller
  let u=0, v=0;
  while (u===0) u=Math.random();
  while (v===0) v=Math.random();
  return Math.sqrt(-2.0*Math.log(u)) * Math.cos(2.0*Math.PI*v) * std + mean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Data Model ----------
function newLeague({ name="My League", year=(new Date().getFullYear()) } = {}) {
  const teams = generateFictionalTeams();
  const season = makeSeason(teams, year);
  return {
    id: uid(),
    name,
    created: Date.now(),
    currentDay: 1,
    season,
    teams,
    history: [], // push completed seasons here
  };
}

function generateFictionalTeams() {
  // 10 conferences x 12 teams = 120 teams
  const confs = [
    { name: "Americana", avg: 78 },
    { name: "Frontier", avg: 76 },
    { name: "Great Lakes", avg: 75 },
    { name: "Sunbelt Metro", avg: 74 },
    { name: "Coastal", avg: 73 },
    { name: "Heartland", avg: 72 },
    { name: "Mountain", avg: 71 },
    { name: "Atlantic", avg: 70 },
    { name: "Prairie", avg: 69 },
    { name: "Pacific Rim", avg: 68 },
  ];
  const nameLeft = ["Bayview","Riverdale","Cedar","Summit","Prairie","Canyon","Harbor","Lakeside","Highland","Pinecrest","Evergreen","Redwood","Stonebridge","Silver Creek","Maplewood","Brookfield","Oak Grove","Fox Ridge","Goldenfield","Blue Valley"];
  const suffix = ["State","Tech","College","University","A&M","Poly","Institute"];

  const teams = [];
  for (const conf of confs) {
    for (let i=0;i<12;i++) {
      const t = {
        id: uid(),
        name: `${choice(nameLeft)} ${choice(suffix)}`,
        conf: conf.name,
        ratingOff: Math.round(conf.avg + gaussian(0, 6)),
        ratingDef: Math.round(conf.avg + gaussian(0, 6)),
        pace: Math.max(60, Math.min(75, Math.round(70 + gaussian(0, 3)))),
        wins: 0, losses: 0, confWins: 0, confLosses: 0,
      };
      teams.push(t);
    }
  }
  return teams;
}

function makeSeason(teams, year) {
  const games = buildSchedule(teams, year);
  return { year, games, bracket: null, champion: null };
}

function buildSchedule(teams, year) {
  // Simple schedule: 20 conf games (double round robin with subset), 8 non-con = 28 total
  const byConf = groupBy(teams, t => t.conf);
  const games = [];
  let day = 1;

  for (const [conf, confTeams] of Object.entries(byConf)) {
    // Shuffle copy
    const t = [...confTeams].sort(()=>Math.random()-0.5);
    // Round robin (single), then mirror for some teams to approximate 20 games
    const rr = roundRobin(t);
    // Take first 10 rounds (each team plays ~10 games), then mirror to get ~20
    const rounds = rr.slice(0, Math.min(10, rr.length));
    for (const round of rounds) {
      for (const [home, away] of round) {
        games.push(newGame({ day, homeId: home.id, awayId: away.id, confGame: true }));
      }
      day++;
    }
    // Mirror home/away for another set
    for (const round of rounds) {
      for (const [home, away] of round) {
        games.push(newGame({ day, homeId: away.id, awayId: home.id, confGame: true }));
      }
      day++;
    }
  }

  // Non-conference: each team gets ~8 non-con opponents from other confs
  const allTeamIds = teams.map(t=>t.id);
  for (const team of teams) {
    let added = 0, tries = 0;
    while (added < 8 && tries < 200) {
      tries++;
      const opp = teams[Math.floor(Math.random()*teams.length)];
      if (opp.id === team.id || opp.conf === team.conf) continue;
      // Avoid duplicates: check existing scheduled meetings
      if (games.some(g => (g.homeId===team.id && g.awayId===opp.id) || (g.awayId===team.id && g.homeId===opp.id))) continue;
      // Alternate home/away
      const home = Math.random() < 0.5 ? team.id : opp.id;
      const away = home === team.id ? opp.id : team.id;
      games.push(newGame({ day, homeId: home, awayId: away, confGame: false }));
      added++;
      if (added % 2 === 0) day++; // space them out a bit
    }
  }

  // Sort by day then randomize within day slightly
  games.sort((a,b)=>a.day - b.day || Math.random()-0.5);
  return games;
}

function newGame({day, homeId, awayId, confGame}) {
  return { id: uid(), day, homeId, awayId, confGame, homeScore: null, awayScore: null, played: false };
}

function groupBy(arr, keyFn){
  const m = {};
  for (const x of arr) {
    const k = keyFn(x);
    (m[k] ||= []).push(x);
  }
  return m;
}

function roundRobin(teams) {
  // Standard circle method for even number of teams; if odd, add a bye
  const list = teams.slice();
  const odd = list.length % 2 === 1;
  if (odd) list.push({__bye:true});
  const n = list.length;
  const half = n/2;
  let left = list.slice(0, half);
  let right = list.slice(half).reverse();
  const rounds = [];
  for (let i=0;i<n-1;i++) {
    const pairings = [];
    for (let j=0;j<half;j++) {
      const t1 = left[j], t2 = right[j];
      if (!t1.__bye && !t2.__bye) {
        // Randomize home
        if (Math.random()<0.5) pairings.push([t1,t2]); else pairings.push([t2,t1]);
      }
    }
    rounds.push(pairings);
    // rotate
    const keep = left[0];
    left = [keep, right[0], ...left.slice(1, half-0)];
    right = [...right.slice(1), left.pop()];
  }
  return rounds;
}

// ---------- Simulation ----------
function simGame(league, game) {
  if (game.played) return game;
  const home = league.teams.find(t=>t.id===game.homeId);
  const away = league.teams.find(t=>t.id===game.awayId);

  const homeEdge = 2.5;
  const pace = (home.pace + away.pace)/2;
  const base = pace;

  const homeOff = home.ratingOff - away.ratingDef + homeEdge;
  const awayOff = away.ratingOff - home.ratingDef;

  let h = Math.round(base + homeOff + gaussian(0, 8));
  let a = Math.round(base + awayOff + gaussian(0, 8));

  h = Math.max(40, h);
  a = Math.max(40, a);
  if (h===a) h += (Math.random()<0.5?1:-1);

  game.homeScore = h;
  game.awayScore = a;
  game.played = true;

  // standings
  const hW = h>a;
  if (hW) {
    home.wins++; away.losses++;
    if (game.confGame) home.confWins++; else null;
    if (game.confGame) away.confLosses++; else null;
  } else {
    away.wins++; home.losses++;
    if (game.confGame) away.confWins++; else null;
    if (game.confGame) home.confLosses++; else null;
  }
  return game;
}

function simToDay(league, targetDay) {
  for (const g of league.season.games) {
    if (!g.played && g.day <= targetDay) {
      simGame(league, g);
    }
  }
  league.currentDay = Math.max(league.currentDay, targetDay);
  maybeStartTournament(league);
}

function simSeason(league) {
  const maxDay = Math.max(...league.season.games.map(g=>g.day));
  simToDay(league, maxDay);
  maybeStartTournament(league);
  if (league.season.bracket) simTournament(league);
}

function maybeStartTournament(league) {
  if (league.season.bracket) return;
  // Start when all regular-season games are played
  if (league.season.games.some(g=>!g.played)) return;

  // Select teams: auto-bids (conf winners by record), + at-large by record + strength
  const byConf = groupBy(league.teams, t => t.conf);
  const selected = [];
  for (const [conf, teams] of Object.entries(byConf)) {
    const winner = [...teams].sort((a,b)=> (b.confWins - b.confLosses) - (a.confWins - a.confLosses) || (b.wins-b.losses)-(a.wins-a.losses) || (b.ratingOff+b.ratingDef)-(a.ratingOff+a.ratingDef))[0];
    selected.push(winner);
  }
  // At-large fill to 64 (or all if fewer)
  const pool = league.teams.filter(t=>!selected.includes(t));
  const need = Math.max(0, Math.min(64, league.teams.length) - selected.length);
  const scored = pool.map(t => ({
    t,
    score: (t.wins - t.losses)*3 + (t.confWins - t.confLosses)*2 + (t.ratingOff + t.ratingDef)/2
  })).sort((a,b)=>b.score-a.score).slice(0,need).map(x=>x.t);
  const field = [...selected, ...scored];
  // Seed by same score
  const seeds = [...field].sort((a,b)=> {
    const sa = (a.wins-a.losses)*3 + (a.confWins-a.confLosses)*2 + (a.ratingOff+a.ratingDef)/2;
    const sb = (b.wins-b.losses)*3 + (b.confWins-b.confLosses)*2 + (b.ratingOff+b.ratingDef)/2;
    return sb - sa;
  });

  const bracket = makeBracket(seeds);
  league.season.bracket = bracket;
}

function makeBracket(seeds) {
  // Create simple single-elim bracket (64 or power of two; if fewer, pad byes)
  let size = 1;
  while (size < seeds.length) size *= 2;
  const byes = size - seeds.length;
  const field = seeds.concat(Array(byes).fill(null));

  // Pair highest vs lowest
  const pairs = [];
  for (let i=0;i<size/2;i++) {
    pairs.push([field[i], field[size-1-i]]);
  }
  return {
    round: 1,
    rounds: [pairs], // array of rounds, each round = array of [teamA, teamB]
    results: [],     // result objects per round
    complete: false,
    champion: null
  };
}

function simTournament(league) {
  const br = league.season.bracket;
  while (!br.complete) {
    const currentPairs = br.rounds[br.round-1];
    const results = [];
    const nextSeeds = [];
    for (const [a,b] of currentPairs) {
      if (a && b) {
        // neutral court sim
        const fakeGame = { homeId:a.id, awayId:b.id, confGame:false, played:false };
        // temporarily treat as game for ratings
        const tempLeague = { teams: league.teams };
        const res = simNeutral(tempLeague, a, b);
        results.push({ a:a.name, b:b.name, score:`${res.a}-${res.b}`, winner: res.winner.name });
        nextSeeds.push(res.winner);
      } else {
        const winner = a || b; // bye
        results.push({ a: a?.name||"BYE", b: b?.name||"BYE", score:"—", winner: winner?.name||"BYE" });
        if (winner) nextSeeds.push(winner);
      }
    }
    br.results.push(results);
    if (nextSeeds.length === 1) {
      br.complete = true;
      br.champion = nextSeeds[0].name;
      league.season.champion = br.champion;
      break;
    }
    // Build next round pairs
    const nextPairs = [];
    for (let i=0;i<nextSeeds.length/2;i++) {
      nextPairs.push([ nextSeeds[i], nextSeeds[nextSeeds.length-1-i] ]);
    }
    br.round++;
    br.rounds.push(nextPairs);
  }
}

function simNeutral(tempLeague, a, b) {
  const pace = (a.pace + b.pace)/2;
  const base = pace;
  const aOff = a.ratingOff - b.ratingDef;
  const bOff = b.ratingOff - a.ratingDef;
  let as = Math.round(base + aOff + gaussian(0,7));
  let bs = Math.round(base + bOff + gaussian(0,7));
  as = Math.max(40, as);
  bs = Math.max(40, bs);
  if (as===bs) as += (Math.random()<0.5?1:-1);
  const winner = as>bs ? a : b;
  return { a:as, b:bs, winner };
}

// ---------- Persistence ----------
function saveLocal(league) {
  localStorage.setItem("cbbgm-active", JSON.stringify(league));
}

function loadLocal() {
  const raw = localStorage.getItem("cbbgm-active");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveCloudPrompt() {
  const dlg = document.getElementById("cloudDialog");
  await showCloudList();
  dlg.showModal();
  const keyInput = document.getElementById("cloudKey");
  keyInput.value = state.league?.name?.toLowerCase().replace(/\s+/g,'-') || "my-league";
  dlg.returnValue = "";
  const decision = await new Promise(res => {
    dlg.addEventListener("close", ()=>res(dlg.returnValue), { once:true });
  });
  if (decision === "save") {
    const key = keyInput.value.trim();
    if (!key) return;
    const ok = await saveCloud(key, state.league);
    if (ok) alert("Saved to cloud as '"+key+"'");
  } else if (decision === "load") {
    const key = keyInput.value.trim();
    if (!key) return;
    const data = await loadCloud(key);
    if (data) {
      state.league = data;
      saveLocal(state.league);
      render();
    } else {
      alert("No league found for that key.");
    }
  }
}

async function showCloudList() {
  const listDiv = document.getElementById("cloudList");
  listDiv.textContent = "Loading…";
  try{
    const res = await fetch("/.netlify/functions/blobList");
    if (!res.ok) throw new Error("list failed");
    const data = await res.json();
    if (!Array.isArray(data) || data.length===0) {
      listDiv.innerHTML = '<div class="empty">No cloud saves yet.</div>';
      return;
    }
    const html = ["<div class='panel'><strong>Existing Saves</strong><ul>"];
    for (const it of data) {
      html.push(`<li><code>${it.key}</code> — updated ${new Date(it.updatedAt||Date.now()).toLocaleString()}</li>`);
    }
    html.push("</ul></div>");
    listDiv.innerHTML = html.join("");
  }catch(e){
    listDiv.innerHTML = `<div class="empty">Could not list saves. Did you deploy Functions? (${e.message})</div>`;
  }
}

async function saveCloud(key, league) {
  try{
    const res = await fetch("/.netlify/functions/blobPut", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ key, data: JSON.stringify(league) })
    });
    return res.ok;
  }catch(e){
    console.error("saveCloud error", e);
    alert("Cloud save failed. Check Netlify Functions/Blobs setup.");
    return false;
  }
}

async function loadCloud(key) {
  try{
    const res = await fetch("/.netlify/functions/blobGet?key="+encodeURIComponent(key));
    if (!res.ok) return null;
    const { data } = await res.json();
    return JSON.parse(data);
  }catch(e){
    console.error("loadCloud error", e);
    alert("Cloud load failed. Check Netlify Functions/Blobs setup.");
    return null;
  }
}

// ---------- UI Rendering ----------
const view = document.getElementById("view");
const tabs = document.querySelectorAll(".tabs button");

for (const btn of tabs) {
  btn.addEventListener("click", () => {
    for (const b of tabs) b.classList.remove("active");
    btn.classList.add("active");
    state.view = btn.dataset.tab;
    render();
  });
}

document.getElementById("newLeagueBtn").addEventListener("click", ()=>{
  if (state.league && !confirm("Start a new league? Current progress will be kept locally but replaced in the UI.")) return;
  state.league = newLeague({ name: "Fictional League" });
  saveLocal(state.league);
  render();
});

document.getElementById("simDayBtn").addEventListener("click", ()=>{
  if (!state.league) return;
  simToDay(state.league, state.league.currentDay+1);
  saveLocal(state.league);
  render();
});

document.getElementById("simSeasonBtn").addEventListener("click", ()=>{
  if (!state.league) return;
  simSeason(state.league);
  saveLocal(state.league);
  render();
});

document.getElementById("saveCloudBtn").addEventListener("click", saveCloudPrompt);
document.getElementById("loadCloudBtn").addEventListener("click", saveCloudPrompt);

document.getElementById("exportBtn").addEventListener("click", ()=>{
  if (!state.league) return;
  const blob = new Blob([JSON.stringify(state.league,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (state.league.name||"league") + ".json";
  a.click();
});

document.getElementById("importFile").addEventListener("change", (ev)=>{
  const f = ev.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      const data = JSON.parse(String(reader.result));
      state.league = data;
      saveLocal(state.league);
      render();
    } catch {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(f);
});

function render() {
  if (!state.league) {
    const saved = loadLocal();
    if (saved) state.league = saved;
  }
  if (!state.league) {
    view.innerHTML = `<div class="panel"><h2>Welcome</h2>
    <p>This is a lightweight <em>college basketball GM-style</em> sim. Click <strong>New League</strong> to generate a fictional Division I universe, then simulate days or seasons. You can save locally or to the cloud (Netlify Blobs).</p>
    </div>`;
    return;
  }

  const l = state.league;
  const totalPlayed = l.season.games.filter(g=>g.played).length;
  const totalGames = l.season.games.length;

  if (state.view === "dashboard") {
    view.innerHTML = `
      <div class="grid cols-3">
        <div class="kpi"><div class="label badge">League</div><div class="value">${escapeHtml(l.name)}</div><div>${l.season.year} Season • Day ${l.currentDay}</div></div>
        <div class="kpi"><div class="label badge">Progress</div><div class="value">${Math.round(totalPlayed/totalGames*100)}%</div><div>${totalPlayed}/${totalGames} games played</div></div>
        <div class="kpi"><div class="label badge">Teams</div><div class="value">${l.teams.length}</div><div>${new Set(l.teams.map(t=>t.conf)).size} conferences</div></div>
      </div>
      ${renderTop25(l)}
      ${renderRecentGames(l)}
    `;
  } else if (state.view === "teams") {
    view.innerHTML = renderTeams(l);
  } else if (state.view === "standings") {
    view.innerHTML = renderStandings(l);
  } else if (state.view === "schedule") {
    view.innerHTML = renderSchedule(l);
  } else if (state.view === "tournament") {
    view.innerHTML = renderTournament(l);
  } else if (state.view === "settings") {
    view.innerHTML = renderSettings(l);
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderTop25(l) {
  // rank by simple composite
  const ranks = [...l.teams].map(t => ({
    t,
    score: (t.wins - t.losses)*3 + (t.confWins - t.confLosses)*2 + (t.ratingOff + t.ratingDef)/2
  })).sort((a,b)=>b.score-a.score).slice(0,25);
  const rows = ranks.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(r.t.name)}</td><td>${escapeHtml(r.t.conf)}</td><td>${r.t.wins}-${r.t.losses}</td></tr>`).join("");
  return `<div class="panel"><h3>Top 25</h3>
    <table class="table"><thead><tr><th>#</th><th>Team</th><th>Conf</th><th>Record</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

function renderRecentGames(l) {
  const recent = [...l.season.games].filter(g=>g.played).slice(-20).reverse();
  if (recent.length===0) return `<div class="panel"><h3>Recent Games</h3><div class="empty">None yet — simulate a day!</div></div>`;
  const rows = recent.map(g => {
    const h = l.teams.find(t=>t.id===g.homeId);
    const a = l.teams.find(t=>t.id===g.awayId);
    return `<tr>
      <td>D${g.day}</td>
      <td>${escapeHtml(a.name)}</td>
      <td>@</td>
      <td>${escapeHtml(h.name)}</td>
      <td><strong>${g.awayScore??""}</strong> - <strong>${g.homeScore??""}</strong></td>
      <td>${g.confGame?'<span class="badge">Conf</span>':''}</td>
    </tr>`;
  }).join("");
  return `<div class="panel"><h3>Recent Games</h3>
    <table class="table"><thead><tr><th>Day</th><th>Away</th><th></th><th>Home</th><th>Score</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

function renderTeams(l) {
  const byConf = groupBy(l.teams, t=>t.conf);
  const sections = Object.entries(byConf).sort().map(([conf, teams]) => {
    const rows = teams.sort((a,b)=> (b.wins-b.losses)-(a.wins-a.losses)).map(t=>`
      <tr>
        <td>${escapeHtml(t.name)}</td>
        <td>${t.wins}-${t.losses}</td>
        <td>${t.confWins}-${t.confLosses}</td>
        <td>${t.ratingOff}</td>
        <td>${t.ratingDef}</td>
        <td>${t.pace}</td>
      </tr>
    `).join("");
    return `<div class="panel"><h3>${escapeHtml(conf)}</h3>
      <table class="table"><thead><tr><th>Team</th><th>W-L</th><th>Conf</th><th>Off</th><th>Def</th><th>Pace</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
  }).join("");
  return `<div class="grid cols-2">${sections}</div>`;
}

function renderStandings(l) {
  const byConf = groupBy(l.teams, t=>t.conf);
  const sections = Object.entries(byConf).sort().map(([conf, teams]) => {
    const rows = teams.sort((a,b)=> (b.confWins - b.confLosses) - (a.confWins - a.confLosses) || (b.wins-b.losses)-(a.wins-a.losses)).map((t,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${t.wins}-${t.losses}</td>
        <td>${t.confWins}-${t.confLosses}</td>
      </tr>`).join("");
    return `<div class="panel"><h3>${escapeHtml(conf)} Standings</h3>
      <table class="table"><thead><tr><th>#</th><th>Team</th><th>Overall</th><th>Conf</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join("");
  return `<div class="grid cols-2">${sections}</div>`;
}

function renderSchedule(l) {
  const days = Math.max(...l.season.games.map(g=>g.day));
  let out = `<div class="panel"><h3>Schedule (Day ${l.currentDay} of ${days})</h3>`;
  for (let d=1; d<=days; d++) {
    const list = l.season.games.filter(g=>g.day===d);
    if (list.length===0) continue;
    const rows = list.map(g => {
      const h = l.teams.find(t=>t.id===g.homeId);
      const a = l.teams.find(t=>t.id===g.awayId);
      const score = g.played ? `<strong>${g.awayScore}</strong> - <strong>${g.homeScore}</strong>` : '<span class="badge">vs</span>';
      return `<tr>
        <td>${g.confGame?'<span class="badge">Conf</span>':''}</td>
        <td>${escapeHtml(a.name)}</td>
        <td>@</td>
        <td>${escapeHtml(h.name)}</td>
        <td>${score}</td>
      </tr>`;
    }).join("");
    out += `<details ${d===l.currentDay?'open':''}><summary>Day ${d}</summary>
      <table class="table"><thead><tr><th></th><th>Away</th><th></th><th>Home</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    </details>`;
  }
  out += `</div>`;
  return out;
}

function renderTournament(l) {
  const br = l.season.bracket;
  if (!br) {
    return `<div class="panel"><h3>National Tournament</h3>
      <div class="empty">Not started yet. Finish the regular season to seed the field.</div>
    </div>`;
  }
  const sections = br.results.map((round, i) => {
    const rows = round.map(r => `<tr><td>${escapeHtml(r.a)}</td><td>vs</td><td>${escapeHtml(r.b)}</td><td>${r.score}</td><td><strong>${escapeHtml(r.winner)}</strong></td></tr>`).join("");
    return `<div class="panel"><h3>Round ${i+1}</h3>
      <table class="table"><thead><tr><th>A</th><th></th><th>B</th><th>Score</th><th>Winner</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join("");
  const champ = br.complete ? `<div class="panel"><h2>Champion: ${escapeHtml(br.champion)}</h2></div>` : "";
  return `<div>${sections}${champ||""}</div>`;
}

function renderSettings(l) {
  return `<div class="panel">
    <h3>League Settings</h3>
    <label>League Name <input id="leagueNameInput" value="${escapeHtml(l.name)}" /></label>
  </div>`;
}

// Settings input handler (delegated)
view.addEventListener("input", (ev)=>{
  if (ev.target?.id === "leagueNameInput") {
    state.league.name = ev.target.value;
    saveLocal(state.league);
  }
});

// Bootstrap
(function init(){
  const loaded = loadLocal();
  state.league = loaded ?? newLeague({ name: "Fictional League" });
  saveLocal(state.league);
  render();
})();
