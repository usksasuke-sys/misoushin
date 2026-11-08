var SAVE_KEY = "misoushin-game";
var SOLUTION = "未送信の 51 43 22 は、な、つ、きです。開いていたメモの 71 31 22 は、ま、さ、きです。表は夏希の携帯にだけ残っていました。20時59分、一度目の扉のあと、太一はまだ手を動かせたので、裕子と莉奈宛ての下書きに 51 43 22 を残しています。送信はしていません。21時01分の二度目のあと、画面を押す動作はできません。21時04分のメモは、太一には打てません。読み方を知っているのは夏希だけです。通話の声は、20時51分から21時10分まで、出る前に残した音声の再生です。20時53分に夏希のカードで団地を出て、21時09分に戻っています。冬美は風呂で、タブレットの声を姉本人だと思いました。20時58分、夏希は太一の携帯から千春へ「開けてください」と送りました。千春が内側から開けた一度目では死んでいません。千春が閉めたあと、夏希は上着の袖でノブを包み、外からもう一度扉を開けました。後頭部の二度目が死因です。顔のあざは、それより前に正樹が殴った拳です。正樹は20時35分には自分の街区の酒屋にいて、21時前には自宅の風呂にいました。動機は、カードのあとの呼び出しです。12 13 51 は「いうな」で、黙っていてほしければ体で払え、という脅しと同じ件です。この夜、来なければ集まりにいる全員に送る、と再び呼び出されたので、夏希はそれを止めるために太一を殺しました。";
var CORE = ["chihiro", "natsu", "masaki"];
var REFS = ["yusuke", "rina", "shinji", "yuko"];
var MISSIONS = [
  { id: "refs", title: "参考人を呼ぶ", text: "集まりにいた祐介、莉奈、慎司、裕子を署に呼ぶ。" },
  { id: "check", title: "話を確かめる", text: "夏希の話を、冬美に確かめる。" },
  { id: "neighbors", title: "近所を回る", text: "太一の家の近所で、前夜のことを聞く。" }
];
var FILE_ORDER = [
  "family", "map", "masaki-line", "saturday", "rina-chihiro", "sit", "past",
  "devices", "receipt", "tanaka-home", "autopsy", "code", "summons",
  "ogita-home", "unsent", "chihiro-line"
];

function fresh() {
  return {
    started: false,
    phase: "night",
    view: "night",
    viewId: "",
    round: 1,
    seen: {},
    marks: {},
    memo: "",
    hints: 0,
    log: [],
    queue: [],
    banner: "",
    closed: false,
    solved: false,
    lastSpot: "",
    ink: [],
    inks: {},
    admin: false
  };
}

function load() {
  try {
    var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "");
    if (saved && saved.seen && saved.log) {
      if (!saved.ink) saved.ink = [];
      if (!saved.inks || typeof saved.inks !== "object") saved.inks = {};
      saved.admin = false;
      saved.banner = "";
      saved.queue = [];
      return saved;
    }
  } catch (e) {}
  return fresh();
}

var state = load();
var inkTool = "look";
var INK_COLORS = [
  { id: "#e23b3b", label: "赤" },
  { id: "#f0c84a", label: "黄" },
  { id: "#4aa3ff", label: "青" },
  { id: "#ffffff", label: "白" }
];
var pick = { who: [], none: false, alibi: "", trick: "" };
var step = "who";
var answerSteps = ["who", "alibi", "trick", "confirm", "result"];

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function personById(id) {
  return STORY.people.filter(function (person) { return person.id === id; })[0];
}

function fileById(id) {
  return STORY.files.filter(function (file) { return file.id === id; })[0];
}

function spotById(id) {
  return STORY.spots.filter(function (spot) { return spot.id === id; })[0];
}

function heard(id, round) {
  return !!state.seen["talk:" + id + ":" + round];
}

function phoneOpened() {
  return !!state.seen["spot:phone"];
}

function autopsyRead() {
  return !!state.seen["file:autopsy"];
}

function coreDone() {
  return CORE.every(function (id) { return heard(id, 1); });
}

function missionOn(id) {
  return !!state.seen["mission:" + id];
}

function openMissions() {
  if (!coreDone()) return [];
  return MISSIONS.filter(function (mission) { return !missionOn(mission.id); });
}

function fieldDone() {
  return coreDone()
    && REFS.every(function (id) { return heard(id, 1); })
    && heard("fuyumi", 1)
    && heard("neighbors", 1)
    && heard("erika", 1);
}

function availablePeople() {
  if (state.phase !== "day") return [];
  var ids = ["chihiro"];
  if (phoneOpened()) ids.push("natsu", "masaki");
  if (missionOn("refs")) ids.push("yusuke", "rina", "shinji", "yuko");
  if (missionOn("check")) ids.push("fuyumi");
  if (heard("masaki", 1)) ids.push("erika");
  if (missionOn("neighbors")) ids.push("neighbors");
  return ids.map(personById);
}

function availableRounds(person) {
  var rounds = [1];
  var id = person.id;
  if (!person.rounds[2]) return rounds;
  if (id === "natsu" && heard("fuyumi", 1)) rounds.push(2);
  if (id === "masaki" && autopsyRead()) rounds.push(2);
  if (["chihiro", "yusuke", "rina", "shinji", "yuko"].indexOf(id) !== -1 && heard(id, 1) && autopsyRead()) rounds.push(2);
  return rounds;
}

function availableFileIds() {
  if (state.phase !== "day") return [];
  var ids = ["family", "map"];
  if (heard("masaki", 1)) ids.push("masaki-line");
  if (heard("rina", 1)) ids.push("saturday", "rina-chihiro");
  if (heard("yusuke", 1) && heard("shinji", 1)) ids.push("sit");
  if (heard("yusuke", 1) && heard("shinji", 1) && heard("yuko", 1)) ids.push("past");
  if (heard("fuyumi", 1)) ids.push("devices");
  if (heard("erika", 1)) ids.push("receipt", "tanaka-home");
  if (fieldDone()) ids.push("autopsy");
  if (heard("natsu", 2)) ids.push("code", "summons", "ogita-home");
  if (autopsyRead()) ids.push("unsent");
  if (heard("chihiro", 2)) ids.push("chihiro-line");
  return FILE_ORDER.filter(function (id) { return ids.indexOf(id) !== -1; });
}

function pendingPeople() {
  return availablePeople().filter(function (person) {
    return availableRounds(person).some(function (round) { return !heard(person.id, round); });
  });
}

function unreadFiles() {
  return availableFileIds().filter(function (id) { return !state.seen["file:" + id]; });
}

function supplementLeft() {
  if (!autopsyRead()) return false;
  return STORY.spots.some(function (spot) {
    return spot.later && state.seen["spot:" + spot.id] && !state.seen["spot:" + spot.id + ":2"];
  });
}

function lead() {
  if (state.phase !== "day") return "玄関の外の話を読み、翌朝の現場へ進む。";
  if (!heard("chihiro", 1)) return "第一発見者の千春から、話を聞ける。";
  if (!phoneOpened()) return "見取りの携帯を触ると、夏希と正樹を呼べる。";
  if (!coreDone() && pendingPeople().length) return "名簿に、まだ話を聞いていない人がいる。";
  if (openMissions().length) return "次の捜査を、署で選べる。";
  if (pendingPeople().length) return "名簿に、まだ話を聞いていない人がいる。";
  if (fieldDone() && !autopsyRead()) return "鑑識から、検視の結果が届いた。";
  if (supplementLeft()) return "検視を踏まえて、現場の同じ箇所をもう一度見られる。";
  if (unreadFiles().length) return "まだ開いていない資料がある。";
  return "告発は、署の机から出せる。";
}

function addLog(id, text, banner) {
  if (!text || state.seen["note:" + id]) return;
  state.seen["note:" + id] = true;
  state.log.push(text);
  if (banner) state.queue.push(text);
}

function sync() {
  if (!state.started) return;
  if (state.phase === "day") addLog("day", "翌日、明るくなった現場へ戻った。");
  STORY.spots.forEach(function (spot) {
    if (state.seen["spot:" + spot.id]) addLog("spot:" + spot.id, spot.first, false);
    if (state.seen["spot:" + spot.id + ":2"] && spot.later) addLog("spot2:" + spot.id, spot.later, false);
  });
  Object.keys(STORY.briefs).forEach(function (key) {
    var seen = key.indexOf("file:") === 0 ? state.seen[key] : state.seen["talk:" + key];
    if (seen) addLog(key, STORY.briefs[key]);
  });
  if (coreDone()) addLog("ev-missions", "三人の話が揃った。次の捜査を、署で選べる。");
  if (fieldDone()) addLog("ev-autopsy", "鑑識から、検視の結果が届いた。");
  if (autopsyRead()) addLog("ev-scene2", "現場へ戻って、同じ箇所をもう一度見られる。");
  if (!state.banner && state.queue.length) state.banner = state.queue.shift();
}

function setView(view, id) {
  state.view = view;
  state.viewId = id || "";
  save();
  render();
}

function render() {
  var title = document.getElementById("title");
  var app = document.getElementById("app");
  title.hidden = !!state.started;
  app.hidden = !state.started;
  if (!state.started) return;
  if (state.view === "file" && state.viewId) state.seen["file:" + state.viewId] = true;
  sync();
  document.getElementById("phase").textContent = state.phase === "day" ? "翌日" : "当夜";
  document.getElementById("go-scene").disabled = state.phase !== "day";
  document.getElementById("go-files").disabled = state.phase !== "day";
  var charge = document.getElementById("go-charge");
  charge.disabled = !autopsyRead();
  document.getElementById("go-solution").hidden = !state.admin;
  var unread = unreadFiles().length;
  document.getElementById("go-files").textContent = unread ? "資料（" + unread + "）" : "資料";
  var banner = document.getElementById("banner");
  banner.hidden = !state.banner;
  document.getElementById("banner-text").textContent = state.banner || "";
  renderRoster();
  renderStage();
  renderNotes();
  save();
}

function renderRoster() {
  var roster = document.getElementById("roster");
  var people = availablePeople();
  roster.hidden = !people.length;
  roster.innerHTML = "";
  if (!people.length) return;
  var heading = document.createElement("h2");
  heading.textContent = "話を聞ける人";
  roster.appendChild(heading);
  people.forEach(function (person) {
    var button = document.createElement("button");
    button.type = "button";
    var rounds = availableRounds(person);
    var waiting = rounds.some(function (round) { return !heard(person.id, round); });
    var again = rounds.indexOf(2) !== -1 && !heard(person.id, 2);
    button.className = "person-btn" + (state.view === "person" && state.viewId === person.id ? " on" : "") + (waiting ? " wait" : "");
    button.innerHTML = "<span>" + person.name + (again ? " ・再" : "") + "</span><small>" + person.role + "</small>";
    button.addEventListener("click", function () { openPerson(person.id); });
    roster.appendChild(button);
  });
}

function openPerson(id) {
  var person = personById(id);
  var rounds = availableRounds(person);
  var pending = rounds.filter(function (round) { return !heard(id, round); });
  state.view = "person";
  state.viewId = id;
  state.round = pending.length ? pending[0] : rounds[rounds.length - 1];
  save();
  render();
}

function renderStage() {
  var stage = document.getElementById("stage");
  if (state.view === "night") {
    stage.innerHTML = nightHtml();
    document.getElementById("to-morning").addEventListener("click", toMorning);
    return;
  }
  if (state.view === "scene") {
    stage.innerHTML = sceneHtml();
    stage.querySelectorAll("[data-spot]").forEach(function (button) {
      button.addEventListener("click", function () { inspect(button.dataset.spot); });
    });
    bindInk(stage);
    return;
  }
  if (state.view === "files") {
    stage.innerHTML = filesHtml();
    stage.querySelectorAll("[data-file]").forEach(function (button) {
      button.addEventListener("click", function () { setView("file", button.dataset.file); });
    });
    return;
  }
  if (state.view === "file") {
    var file = fileById(state.viewId);
    stage.innerHTML = inkBarHtml() + paperOpen("file:" + file.id) + "<h2>" + file.title + "</h2>" + file.html + "<button type=\"button\" id=\"back-files\">資料の一覧へ</button></article>";
    document.getElementById("back-files").addEventListener("click", function () { setView("files"); });
    bindInkTools(stage);
    bindTextInk(stage);
    return;
  }
  if (state.view === "person") {
    renderPerson(stage);
    return;
  }
  stage.innerHTML = deskHtml();
  var deskScene = document.getElementById("desk-scene");
  if (deskScene) deskScene.addEventListener("click", function () { setView("scene"); });
  stage.querySelectorAll("[data-mission]").forEach(function (button) {
    button.addEventListener("click", function () { startMission(button.dataset.mission); });
  });
}

function nightHtml() {
  return "<div class=\"scene night\"><div class=\"scene-frame\"><div class=\"scene-board\">" + STORY.sceneSvg + "</div><p class=\"scene-caption\">二十二時四十八分。鈴木家の玄関の外。</p></div></div><article class=\"paper\"><h2>当夜</h2><p>あなたは新米刑事だ。土曜の夜、鈴木太一の妻、千春から通報が入った。先輩と、玄関の外に着く。</p><p>千春は、二十時五十八分に「開けてください」と来たので扉を開けた、と言った。いつものように段の上で寝ていて、扉の縁が体に当たった。謝って閉め、鍵はかけなかった。戻ってこないので、二十二時十分ごろ、もう一度開けた。血を見て、死んでいると分かった。画面には、数字だけが出ていた。</p><p>先輩が、今夜は確保だけだ、と言った。端末は回収したが、中身は明日だ。現場は、明るくなってからもう一度見ろ。</p><button type=\"button\" id=\"to-morning\">翌朝、現場へ</button></article>";
}

function toMorning() {
  state.phase = "day";
  state.view = "scene";
  state.viewId = "";
  save();
  render();
}

function inkBarHtml() {
  var html = "<div class=\"ink-bar\"><button type=\"button\" class=\"ink-mode" + (inkTool === "look" ? " on" : "") + "\" data-ink=\"look\">見る</button>";
  INK_COLORS.forEach(function (color) {
    html += "<button type=\"button\" class=\"ink-swatch" + (inkTool === color.id ? " on" : "") + "\" data-ink=\"" + color.id + "\" style=\"background:" + color.id + "\" aria-label=\"" + color.label + "\"></button>";
  });
  html += "<button type=\"button\" class=\"ink-mode" + (inkTool === "erase" ? " on" : "") + "\" data-ink=\"erase\">消す</button>";
  html += "<button type=\"button\" class=\"ink-mode\" data-ink=\"clear\">全部消す</button></div>";
  return html;
}

function sceneHtml() {
  var html = inkBarHtml();
  html += "<div class=\"scene" + (inkTool === "look" ? "" : " inking") + "\"><div class=\"scene-frame\"><div class=\"scene-board\">" + STORY.sceneSvg + "</div>";
  html += "<canvas class=\"scene-ink\" aria-hidden=\"true\"></canvas>";
  var areas = STORY.spots.filter(function (spot) { return spot.width || spot.height; });
  var points = STORY.spots.filter(function (spot) { return !(spot.width || spot.height); });
  areas.concat(points).forEach(function (spot) {
    var box = "left:" + spot.left + ";top:" + spot.top + ";";
    if (spot.width) box += "width:" + spot.width + ";";
    if (spot.height) box += "height:" + spot.height + ";";
    var wide = spot.width || spot.height ? " area" : "";
    html += "<button type=\"button\" class=\"pin" + wide + "\" style=\"" + box + "\" data-spot=\"" + spot.id + "\" aria-label=\"" + spot.label + "\"></button>";
  });
  html += "<p class=\"scene-caption\">翌日。明るくなった玄関。</p></div></div>";
  if (state.lastSpot) {
    var spot = spotById(state.lastSpot);
    var text = state.seen["spot:" + spot.id + ":2"] && spot.later ? spot.later : spot.first;
    html += "<article class=\"paper slim\"><h2>" + spot.label + "</h2><p>" + text + "</p></article>";
  }
  return html;
}

function drawStroke(ctx, stroke, width, height) {
  if (!stroke.points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = (stroke.erase ? 0.05 : 0.018) * width;
  if (stroke.erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.9;
  }
  ctx.beginPath();
  stroke.points.forEach(function (point, index) {
    var x = point[0] * width;
    var y = point[1] * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] * width + 0.2, stroke.points[0][1] * height);
  ctx.stroke();
  ctx.restore();
}

function paperOpen(inkId) {
  return "<article class=\"paper" + (inkTool === "look" ? "" : " inking") + "\" data-ink-id=\"" + inkId + "\">";
}

function textNodes(sheet) {
  var walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      var parent = node.parentNode;
      while (parent && parent !== sheet) {
        var tag = parent.tagName;
        if (tag === "BUTTON" || tag === "TEXTAREA" || tag === "INPUT" || tag === "SCRIPT" || tag === "STYLE") {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function unwrapInks(sheet) {
  sheet.querySelectorAll("mark.ink").forEach(function (mark) {
    var parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  sheet.normalize();
}

function paintNode(node, nodeStart, ranges) {
  var length = node.nodeValue.length;
  var local = [];
  ranges.forEach(function (range) {
    var start = Math.max(0, range.start - nodeStart);
    var end = Math.min(length, range.end - nodeStart);
    if (end > start) local.push({ start: start, end: end, color: range.color });
  });
  local.sort(function (a, b) { return b.start - a.start; });
  local.forEach(function (range) {
    var text = node;
    if (range.start > 0) text = node.splitText(range.start);
    var span = range.end - range.start;
    if (span < text.nodeValue.length) text.splitText(span);
    var mark = document.createElement("mark");
    mark.className = "ink";
    mark.setAttribute("data-color", range.color);
    text.parentNode.insertBefore(mark, text);
    mark.appendChild(text);
  });
}

function paintSheet(sheet, ranges) {
  if (!sheet) return;
  unwrapInks(sheet);
  var nodes = textNodes(sheet);
  var cursor = 0;
  var parts = nodes.map(function (node) {
    var start = cursor;
    cursor += node.nodeValue.length;
    return { node: node, start: start };
  });
  for (var i = parts.length - 1; i >= 0; i--) paintNode(parts[i].node, parts[i].start, ranges || []);
}

function applyStroke(ranges, start, end, color) {
  if (end < start) {
    var swap = start;
    start = end;
    end = swap;
  }
  if (end <= start) {
    return (ranges || []).map(function (range) {
      return { start: range.start, end: range.end, color: range.color };
    });
  }
  var next = [];
  (ranges || []).forEach(function (range) {
    if (range.end <= start || range.start >= end) {
      next.push({ start: range.start, end: range.end, color: range.color });
      return;
    }
    if (range.start < start) next.push({ start: range.start, end: start, color: range.color });
    if (range.end > end) next.push({ start: end, end: range.end, color: range.color });
  });
  if (color && end > start) next.push({ start: start, end: end, color: color });
  next.sort(function (a, b) { return a.start - b.start; });
  var merged = [];
  next.forEach(function (range) {
    var last = merged[merged.length - 1];
    if (last && last.color === range.color && last.end >= range.start) last.end = Math.max(last.end, range.end);
    else merged.push(range);
  });
  return merged;
}

function caretAt(x, y) {
  if (document.caretRangeFromPoint) {
    var range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }
  if (document.caretPositionFromPoint) {
    var caret = document.caretPositionFromPoint(x, y);
    if (!caret) return null;
    return { node: caret.offsetNode, offset: caret.offset };
  }
  return null;
}

function offsetAt(sheet, x, y) {
  var hit = caretAt(x, y);
  if (!hit || !sheet.contains(hit.node)) return null;
  if (hit.node.nodeType !== 3) {
    var child = hit.node.childNodes[hit.offset];
    if (child && child.nodeType === 3) hit = { node: child, offset: 0 };
    else return null;
  }
  var nodes = textNodes(sheet);
  var cursor = 0;
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] === hit.node) return cursor + Math.max(0, Math.min(hit.offset, nodes[i].nodeValue.length));
    cursor += nodes[i].nodeValue.length;
  }
  return null;
}

function bindTextInk(root) {
  var sheet = root.querySelector(".paper[data-ink-id]");
  if (!sheet) return;
  if (!state.inks || typeof state.inks !== "object") state.inks = {};
  var id = sheet.dataset.inkId;
  paintSheet(sheet, state.inks[id] || []);
  var drag = null;

  sheet.addEventListener("pointerdown", function (event) {
    if (inkTool === "look") return;
    if (event.target.closest("button, a, textarea, input")) return;
    var start = offsetAt(sheet, event.clientX, event.clientY);
    if (start == null) return;
    drag = { pointer: event.pointerId, start: start, end: start };
    try { sheet.setPointerCapture(event.pointerId); } catch (e) {}
    event.preventDefault();
  }, { passive: false });
  sheet.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    event.preventDefault();
    var end = offsetAt(sheet, event.clientX, event.clientY);
    if (end == null) return;
    drag.end = end;
    var color = inkTool === "erase" ? null : inkTool;
    paintSheet(sheet, applyStroke(state.inks[id] || [], drag.start, end, color));
  }, { passive: false });
  sheet.addEventListener("touchmove", function (event) {
    if (!drag) return;
    event.preventDefault();
  }, { passive: false });
  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.pointer)) return;
    var end = event ? offsetAt(sheet, event.clientX, event.clientY) : null;
    if (end == null) end = drag.end;
    if (end != null && end !== drag.start) {
      var color = inkTool === "erase" ? null : inkTool;
      state.inks[id] = applyStroke(state.inks[id] || [], drag.start, end, color);
      paintSheet(sheet, state.inks[id]);
      save();
    } else paintSheet(sheet, state.inks[id] || []);
    drag = null;
  }
  sheet.addEventListener("pointerup", finish);
  sheet.addEventListener("pointercancel", function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (drag.end === drag.start) {
      drag = null;
      paintSheet(sheet, state.inks[id] || []);
      return;
    }
    finish(event);
  });
}

function bindInkTools(root) {
  root.querySelectorAll("[data-ink]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.ink === "clear") {
        var sheet = root.querySelector(".paper[data-ink-id]");
        if (sheet) {
          if (!state.inks || typeof state.inks !== "object") state.inks = {};
          state.inks[sheet.dataset.inkId] = [];
          paintSheet(sheet, []);
        }
        var canvas = root.querySelector(".scene-ink");
        if (canvas || !sheet) {
          state.ink = [];
          if (canvas) {
            var ctx = canvas.getContext("2d");
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        save();
        return;
      }
      inkTool = button.dataset.ink;
      var scene = root.querySelector(".scene");
      if (scene) scene.classList.toggle("inking", inkTool !== "look");
      var sheet = root.querySelector(".paper[data-ink-id]");
      if (sheet) sheet.classList.toggle("inking", inkTool !== "look");
      root.querySelectorAll("[data-ink]").forEach(function (item) {
        item.classList.toggle("on", item.dataset.ink === inkTool);
      });
    });
  });
}

function bindInk(root) {
  bindInkTools(root);
  var canvas = root.querySelector(".scene-ink");
  var board = root.querySelector(".scene-board");
  if (!canvas || !board) return;
  var drawing = null;

  function paint() {
    var ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    (state.ink || []).forEach(function (stroke) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    });
    if (drawing) drawStroke(ctx, drawing, canvas.width, canvas.height);
  }

  function fit() {
    var width = board.clientWidth;
    var height = board.clientHeight;
    if (!width || !height) return;
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint();
  }

  function point(event) {
    var rect = canvas.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    ];
  }

  canvas.addEventListener("pointerdown", function (event) {
    if (inkTool === "look") return;
    canvas.setPointerCapture(event.pointerId);
    drawing = { color: inkTool, erase: inkTool === "erase", points: [point(event)] };
    paint();
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("pointermove", function (event) {
    if (!drawing) return;
    drawing.points.push(point(event));
    paint();
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", function (event) {
    if (!drawing) return;
    event.preventDefault();
  }, { passive: false });
  function finish(event) {
    if (!drawing) return;
    if (event) drawing.points.push(point(event));
    state.ink.push(drawing);
    drawing = null;
    save();
    paint();
  }
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", function () {
    if (!drawing) return;
    if (drawing.points.length < 2) {
      drawing = null;
      paint();
      return;
    }
    finish();
  });

  if (board.getBoundingClientRect().height) fit();
  else requestAnimationFrame(fit);
  if (window.inkResize) window.removeEventListener("resize", window.inkResize);
  window.inkResize = function () {
    if (!document.body.contains(canvas)) return;
    fit();
  };
  window.addEventListener("resize", window.inkResize);
}

function inspect(id) {
  var spot = spotById(id);
  if (!state.seen["spot:" + id]) state.seen["spot:" + id] = true;
  else if (spot.later && autopsyRead() && !state.seen["spot:" + id + ":2"]) state.seen["spot:" + id + ":2"] = true;
  state.lastSpot = id;
  save();
  render();
}

function filesHtml() {
  var html = "<article class=\"paper\"><h2>資料</h2><div class=\"file-list\">";
  availableFileIds().forEach(function (id) {
    var file = fileById(id);
    var fresh = state.seen["file:" + id] ? "" : " wait";
    html += "<button type=\"button\" class=\"file-btn" + fresh + "\" data-file=\"" + id + "\">" + file.title + "</button>";
  });
  html += "</div></article>";
  return html;
}

function deskHtml() {
  var missions = openMissions();
  if (missions.length) {
    var html = "<article class=\"paper\"><h2>次の捜査</h2><p>千春、夏希、正樹の話が揃った。次に何をするか、ここから選ぶ。</p><div class=\"file-list\">";
    missions.forEach(function (mission) {
      html += "<button type=\"button\" class=\"file-btn wait\" data-mission=\"" + mission.id + "\"><span>" + mission.title + "</span><small>" + mission.text + "</small></button>";
    });
    html += "</div></article>";
    return html;
  }
  return "<article class=\"paper\"><h2>署</h2><p>" + (state.phase === "day" ? "翌日の朝。鈴木太一の死を、ここから調べる。" : "当夜の確保が終わっていない。") + "</p><button type=\"button\" id=\"desk-scene\">現場へ</button></article>";
}

function startMission(id) {
  state.seen["mission:" + id] = true;
  if (id === "neighbors") {
    openPerson("neighbors");
    return;
  }
  var note = id === "refs"
    ? "祐介、莉奈、慎司、裕子を署に呼んだ。"
    : "冬美に、話を確かめる。";
  addLog("mission:" + id, note);
  save();
  render();
}

function renderPerson(stage) {
  var person = personById(state.viewId);
  var rounds = availableRounds(person);
  if (rounds.indexOf(state.round) === -1) state.round = rounds[0];
  var known = heard(person.id, state.round);
  var html = inkBarHtml() + paperOpen("person:" + person.id + ":" + state.round) + "<p class=\"role\">" + person.role + "</p><h2>" + person.name + "</h2>";
  if (rounds.length > 1) {
    html += "<div class=\"rounds\">";
    rounds.forEach(function (round) {
      html += "<button type=\"button\" class=\"round" + (round === state.round ? " on" : "") + "\" data-round=\"" + round + "\">" + (round === 1 ? "一回目" : "二回目") + "</button>";
    });
    html += "</div>";
  }
  html += person.rounds[state.round];
  if (!known) html += "<button type=\"button\" id=\"keep-talk\">この話をメモに残す</button>";
  else html += "<p class=\"kept\">この話は、メモに残してある。</p>";
  html += "<button type=\"button\" id=\"back-desk\">署へ戻る</button></article>";
  stage.innerHTML = html;
  stage.querySelectorAll("[data-round]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.round = Number(button.dataset.round);
      save();
      render();
    });
  });
  var keep = document.getElementById("keep-talk");
  if (keep) keep.addEventListener("click", keepTalk);
  document.getElementById("back-desk").addEventListener("click", function () { setView("desk"); });
  bindInkTools(stage);
  bindTextInk(stage);
}

function keepTalk() {
  var before = coreDone();
  state.seen["talk:" + state.viewId + ":" + state.round] = true;
  if (!before && coreDone()) {
    state.view = "desk";
    state.viewId = "";
  }
  save();
  render();
}

function renderNotes() {
  var notes = document.getElementById("notes");
  var memo = document.getElementById("memo");
  var focused = memo && document.activeElement === memo;
  var start = focused ? memo.selectionStart : 0;
  var end = focused ? memo.selectionEnd : 0;
  var html = "<h2>わかったこと</h2>";
  if (!state.log.length) html += "<p class=\"empty\">まだ、何も書いていない。</p>";
  else {
    html += "<div class=\"log-list\">";
    state.log.forEach(function (line) { html += "<p>" + line + "</p>"; });
    html += "</div>";
  }
  html += "<h2>見立て</h2>";
  var marked = STORY.people.filter(function (person) { return person.suspect && heard(person.id, 1); });
  if (!marked.length) html += "<p class=\"empty\">話を聞くと、名前が並ぶ。</p>";
  else {
    marked.forEach(function (person) {
      html += "<div class=\"mark-row\"><span>" + person.name + "</span><span class=\"marks\">";
      ["シロ", "保留", "クロ"].forEach(function (label) {
        var on = state.marks[person.suspect] === label ? " on" : "";
        html += "<button type=\"button\" class=\"mark" + on + "\" data-who=\"" + person.suspect + "\" data-mark=\"" + label + "\">" + label + "</button>";
      });
      html += "</span></div>";
    });
  }
  html += "<label for=\"memo\">メモ</label><textarea id=\"memo\"></textarea>";
  notes.innerHTML = html;
  var field = document.getElementById("memo");
  field.value = state.memo || "";
  field.addEventListener("input", function () {
    state.memo = field.value;
    save();
  });
  if (focused) {
    field.focus();
    field.selectionStart = start;
    field.selectionEnd = end;
  }
  notes.querySelectorAll(".mark").forEach(function (button) {
    button.addEventListener("click", function () {
      state.marks[button.dataset.who] = button.dataset.mark;
      save();
      renderNotes();
    });
  });
}

function itemLabel(list, id) {
  var found = list.filter(function (item) { return item.id === id; })[0];
  return found ? found.label : "";
}

function chosenPeople() {
  return STORY.suspects.filter(function (person) { return pick.who.indexOf(person.id) !== -1; });
}

function whoKey() {
  if (pick.none) return "none";
  var ids = chosenPeople().map(function (person) { return person.id; });
  return ids.length === 1 ? ids[0] : ids.join("+");
}

function whoNames() {
  return chosenPeople().map(function (person) { return person.name; }).join("、");
}

function whoSummary() {
  if (pick.none) return "犯人はいない。事故";
  if (pick.who.length === 1) return "一人：" + whoNames();
  if (pick.who.length > 1) return "複数：" + whoNames();
  return "";
}

function whoCountText() {
  if (pick.none) return "犯人はいない。事故です";
  if (!pick.who.length) return "まだ選んでいません";
  if (pick.who.length === 1) return "一人です";
  return "複数です（" + pick.who.length + "人）";
}

function openAnswer() {
  if (!autopsyRead()) return;
  pick = { who: [], none: false, alibi: "", trick: "" };
  step = "who";
  document.getElementById("modal").hidden = false;
  renderAnswer();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  document.getElementById("modal").innerHTML = "";
}

function moveStep(next) {
  step = next;
  renderAnswer();
}

function renderAnswer() {
  var modal = document.getElementById("modal");
  modal.hidden = false;
  var title = "人";
  var body = "";
  if (step === "result") {
    renderResult(modal);
    return;
  }
  if (step === "confirm") {
    title = "これでよろしいですか？";
    body = summaryBlock("人", whoSummary());
    if (!pick.none) {
      body += summaryBlock("崩れるアリバイ", itemLabel(STORY.alibis, pick.alibi));
      body += summaryBlock("犯行トリック", itemLabel(STORY.tricks, pick.trick));
    }
  } else if (step === "alibi") {
    title = "崩れるアリバイ";
  } else if (step === "trick") {
    title = "犯行トリック";
  }
  modal.innerHTML = "<div class=\"modal-card\"><h2>" + title + "</h2><div id=\"modal-body\"></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  var box = document.getElementById("modal-body");
  var actions = document.getElementById("modal-actions");
  if (step === "confirm") {
    box.className = "summary";
    box.innerHTML = body;
    actions.appendChild(actionButton("はい", function () { moveStep("result"); }));
    actions.appendChild(actionButton("戻る", function () { moveStep(pick.none ? "who" : "trick"); }));
    return;
  }
  if (step === "who") {
    STORY.suspects.forEach(function (person) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "choice" + (pick.who.indexOf(person.id) !== -1 ? " on" : "");
      button.textContent = person.name;
      button.addEventListener("click", function () {
        pick.none = false;
        var at = pick.who.indexOf(person.id);
        if (at === -1) pick.who.push(person.id);
        else pick.who.splice(at, 1);
        renderAnswer();
      });
      box.appendChild(button);
    });
    var count = document.createElement("p");
    count.className = "who-count";
    count.textContent = whoCountText();
    box.appendChild(count);
    var none = document.createElement("button");
    none.type = "button";
    none.className = "choice" + (pick.none ? " on" : "");
    none.textContent = "犯人はいない。事故";
    none.addEventListener("click", function () {
      pick.none = !pick.none;
      if (pick.none) pick.who = [];
      renderAnswer();
    });
    box.appendChild(none);
    actions.appendChild(actionButton("次へ", function () {
      if (!pick.none && !pick.who.length) return;
      moveStep(pick.none ? "confirm" : "alibi");
    }));
    actions.appendChild(actionButton("署へ戻る", closeModal));
    return;
  }
  var list = step === "alibi" ? STORY.alibis : STORY.tricks;
  list.forEach(function (item) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = item.label;
    button.addEventListener("click", function () {
      pick[step] = item.id;
      moveStep(answerSteps[answerSteps.indexOf(step) + 1]);
    });
    box.appendChild(button);
  });
  actions.appendChild(actionButton("戻る", function () {
    moveStep(answerSteps[answerSteps.indexOf(step) - 1]);
  }));
}

function summaryBlock(label, text) {
  return "<p class=\"label\">" + label + "</p><p>" + text + "</p>";
}

function actionButton(label, onClick) {
  var button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderResult(modal) {
  var correct = whoKey() === "s6" && pick.alibi === "ab1" && pick.trick === "tr1";
  var title = "不正解";
  var text = "この読みは、資料と合いません。";
  var again = false;
  if (correct) {
    state.solved = true;
    state.closed = false;
    save();
    title = "正解";
    text = SOLUTION;
  } else if (whoKey() === "s7" && pick.trick === "tr2") {
    state.closed = true;
    save();
    text = "翌朝の調べは、ここで閉じたように見えます。メモの数字は正樹の名に読め、顔のあざは拳と合います。正樹は殴っています。それでも、その殴った時刻のあと、太一は起きて電話をしています。";
    again = true;
  } else if (whoKey() === "s5" && pick.trick === "tr3") {
    state.closed = true;
    save();
    text = "扉の縁には血があり、千春は発見まで時間を置いています。一度目に扉を開けたのは千春です。それでも、その一度目では死んでいません。";
    again = true;
  } else if (whoKey() === "none") {
    text = "この死は、事故では閉じていません。扉の音は二度あります。";
  } else if (whoKey() === "s6" && pick.alibi === "ab1") {
    text = "居場所は崩れています。死なせた手順は、扉の回数と、二つの数字です。";
  } else if (whoKey() === "s6" && pick.trick === "tr1") {
    text = "手順はそちらです。団地にいた、という裏取りのほうを見てください。";
  } else if (whoKey() === "s7") {
    text = "正樹は殴っています。酒屋と風呂の時刻を、メモの更新と並べてください。";
  } else if (whoKey() === "s5") {
    text = "扉の一度目は千春です。二度目の向きと、21時04分を見てください。";
  } else if (whoKey() === "s1+s4") {
    text = "莉奈と裕子は、通話のあいだ団地にいます。現場の扉の外にいたのは、この二人ではありません。";
  } else if (whoKey() === "s2+s3") {
    text = "祐介と慎司は、21時の連絡で互いを支え合っています。この二人の居場所は崩れていません。";
  }
  modal.innerHTML = "<div class=\"modal-card\"><h2>" + title + "</h2><div class=\"end\"><p></p></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  modal.querySelector(".end p").textContent = text;
  var actions = document.getElementById("modal-actions");
  if (again) {
    actions.appendChild(actionButton("もう一度開く", function () {
      state.closed = false;
      save();
      moveStep("who");
    }));
  }
  actions.appendChild(actionButton("署へ戻る", closeModal));
}

function choiceLabel(list, id) {
  var item = list.filter(function (entry) { return entry.id === id; })[0];
  return item ? (item.name || item.label) : "";
}

function openSolution() {
  if (!state.admin) return;
  var solved = state.solved;
  var modal = document.getElementById("modal");
  modal.hidden = false;
  modal.innerHTML = "<div class=\"modal-card\"><h2>答え</h2><div class=\"summary\">"
    + summaryBlock("人", "荻田夏希")
    + summaryBlock("崩れるアリバイ", "団地にいて通話していた、という裏取り。声は再生で、20時53分から21時09分まで夏希は団地にいない")
    + summaryBlock("犯行トリック", "51 43 22 を 71 31 22 へ書き換え、致死なのは外から扉で打った二度目")
    + "</div><div class=\"end\"><p></p></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  modal.querySelector(".end p").textContent = SOLUTION;
  document.getElementById("modal-actions").appendChild(actionButton("署へ戻る", closeModal));
  state.solved = solved;
}

function openHints() {
  var modal = document.getElementById("modal");
  modal.hidden = false;
  modal.innerHTML = "<div class=\"modal-card\"><h2>ヒント</h2><div id=\"modal-body\"></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  var body = document.getElementById("modal-body");
  var p = document.createElement("p");
  p.textContent = lead();
  body.appendChild(p);
  document.getElementById("modal-actions").appendChild(actionButton("署へ戻る", closeModal));
}

var ADMIN_PASS = "pass";

document.getElementById("admin-mode").addEventListener("change", function () {
  var wrap = document.getElementById("admin-pass-wrap");
  wrap.hidden = !this.checked;
  document.getElementById("admin-note").hidden = true;
  if (!this.checked) document.getElementById("admin-pass").value = "";
});

document.getElementById("start").addEventListener("click", function () {
  var box = document.getElementById("admin-mode");
  var note = document.getElementById("admin-note");
  if (box.checked && document.getElementById("admin-pass").value !== ADMIN_PASS) {
    note.hidden = false;
    return;
  }
  note.hidden = true;
  state.started = true;
  state.admin = box.checked;
  state.phase = "night";
  state.view = "night";
  save();
  render();
});

document.getElementById("go-desk").addEventListener("click", function () {
  setView(state.phase === "day" ? "desk" : "night");
});

document.getElementById("go-scene").addEventListener("click", function () {
  if (state.phase === "day") setView("scene");
});

document.getElementById("go-files").addEventListener("click", function () {
  if (state.phase === "day") setView("files");
});

document.getElementById("go-hint").addEventListener("click", openHints);
document.getElementById("go-charge").addEventListener("click", openAnswer);
document.getElementById("go-solution").addEventListener("click", openSolution);
document.getElementById("banner-ok").addEventListener("click", function () {
  state.banner = state.queue.shift() || "";
  save();
  render();
});

document.getElementById("go-reset").addEventListener("click", function () {
  if (!confirm("最初からやり直します。書いたメモも消えます。")) return;
  localStorage.removeItem(SAVE_KEY);
  state = fresh();
  document.getElementById("admin-mode").checked = false;
  document.getElementById("admin-pass").value = "";
  document.getElementById("admin-pass-wrap").hidden = true;
  document.getElementById("admin-note").hidden = true;
  closeModal();
  render();
});

render();
