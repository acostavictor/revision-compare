/* Revision Compare: UI flow.
   1. Drop the earlier set. 2. Drop the later set. 3. Comparison runs
   on its own. Sheets are matched by sheet number. */
(function () {
  function $(id) { return document.getElementById(id); }
  var setA = [], setB = [];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function trunc(s, n) {
    s = s || "";
    return s.length > n ? s.slice(0, n) + "..." : s;
  }

  function renderChips(set, el, onRemove) {
    el.innerHTML = set.map(function (f, i) {
      return '<span class="chip">' + esc(f.name) + ' <button class="chip-x" data-i="' + i + '" title="Remove this file">x</button></span>';
    }).join("");
    el.querySelectorAll(".chip-x").forEach(function (btn) {
      btn.addEventListener("click", function () {
        set.splice(parseInt(btn.getAttribute("data-i"), 10), 1);
        onRemove();
      });
    });
  }

  function handleFiles(list, set, chipsEl, statusEl, after) {
    var files = Array.prototype.slice.call(list || []);
    var pdfs = files.filter(function (f) { return f.name.toLowerCase().slice(-4) === ".pdf"; });
    if (!window.pdfjsLib || !window.RevisionPDF || !window.RevisionCompare) {
      statusEl.textContent = "The PDF engine did not load. Check your connection and retry.";
      return;
    }
    if (!pdfs.length) { statusEl.textContent = "No PDFs selected. This tool reads PDFs only."; return; }
    pdfs.forEach(function (f) {
      if (set.map(function (x) { return x.name; }).indexOf(f.name) < 0) set.push(f);
    });
    renderChips(set, chipsEl, after);
    statusEl.textContent = set.length + " file(s) in this set.";
    after();
  }

  function refreshA() {
    renderChips(setA, $("chipsA"), refreshA);
    $("statusA").textContent = setA.length ? setA.length + " file(s) in this set." : "No files yet.";
    maybeRun();
  }
  function refreshB() {
    renderChips(setB, $("chipsB"), refreshB);
    $("statusB").textContent = setB.length ? setB.length + " file(s) in this set." : "No files yet.";
    maybeRun();
  }

  function maybeRun() {
    if (!setA.length || !setB.length) { $("results").style.display = "none"; return; }
    $("compareStatus").textContent = "Reading both sets in your browser...";
    $("results").style.display = "block";
    var jobA = setA.map(function (f) {
      return RevisionPDF.analyzeOne(f).catch(function () { return { name: f.name, pages: [], textChars: 0, error: true }; });
    });
    var jobB = setB.map(function (f) {
      return RevisionPDF.analyzeOne(f).catch(function () { return { name: f.name, pages: [], textChars: 0, error: true }; });
    });
    Promise.all([Promise.all(jobA), Promise.all(jobB)]).then(function (pair) {
      var issues = [];
      function clean(results, label) {
        var ok = [];
        results.forEach(function (r) {
          if (r.error) { issues.push("File could not be read: " + r.name + ". Confirm it is a valid PDF and re-upload it."); return; }
          if (r.textChars === 0) { issues.push("No extractable text in " + r.name + " (" + label + " set). It may be a scan. Its pages could not be compared."); return; }
          ok.push(r);
        });
        return ok;
      }
      var cleanA = clean(pair[0], "earlier"), cleanB = clean(pair[1], "later");
      var d = RevisionCompare.diffSets(cleanA, cleanB);
      d.unnumberedA.forEach(function (u) { issues.push("Earlier set, " + u.file + " page " + u.page + ": no sheet number found, could not be matched."); });
      d.unnumberedB.forEach(function (u) { issues.push("Later set, " + u.file + " page " + u.page + ": no sheet number found, could not be matched."); });
      d.dupsA.forEach(function (s) { issues.push("Sheet number " + s + " appears more than once in the earlier set. Only the first occurrence was compared."); });
      d.dupsB.forEach(function (s) { issues.push("Sheet number " + s + " appears more than once in the later set. Only the first occurrence was compared."); });

      $("statSheetsA").textContent = d.sheetsA;
      $("statSheetsB").textContent = d.sheetsB;
      $("statAdded").textContent = d.added.length;
      $("statRemoved").textContent = d.removed.length;
      $("statChanged").textContent = d.changed.length;
      $("statUnchanged").textContent = d.unchanged.length;
      $("addedList").innerHTML = d.added.length ? d.added.map(function (p) { return "<li><strong>" + esc(p.sheet) + "</strong>" + (p.title ? " " + esc(trunc(p.title, 90)) : "") + " (" + esc(p.file) + ")</li>"; }).join("") : "<li>Nothing added.</li>";
      $("removedList").innerHTML = d.removed.length ? d.removed.map(function (p) { return "<li><strong>" + esc(p.sheet) + "</strong>" + (p.title ? " " + esc(trunc(p.title, 90)) : "") + " (" + esc(p.file) + ")</li>"; }).join("") : "<li>Nothing removed.</li>";
      $("changedList").innerHTML = d.changed.length ? d.changed.map(function (c) {
        var bits = [];
        if (c.contentChanged) bits.push("content changed");
        if (c.titleChanged) bits.push("title changed from \"" + esc(trunc(c.titleA, 60)) + "\" to \"" + esc(trunc(c.titleB, 60)) + "\"");
        if (c.sizeChanged) bits.push("size changed from " + esc(c.sizeA) + " in to " + esc(c.sizeB) + " in");
        if (c.fileChanged) bits.push("moved from " + esc(c.fileA) + " to " + esc(c.fileB));
        return "<li><strong>" + esc(c.sheet) + "</strong>: " + bits.join(", ") + "</li>";
      }).join("") : "<li>Nothing changed.</li>";
      $("unchangedList").innerHTML = d.unchanged.length ? d.unchanged.map(function (p) { return "<li><strong>" + esc(p.sheet) + "</strong>" + (p.title ? " " + esc(trunc(p.title, 90)) : "") + (p.fileChanged ? " (moved to " + esc(p.file) + ")" : "") + "</li>"; }).join("") : "<li>None.</li>";
      $("unchangedSummary").textContent = "Unchanged (" + d.unchanged.length + ")";
      $("issuesList").innerHTML = issues.length ? issues.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") : "<li>None. Every page had a sheet number and readable text.</li>";
      $("compareStatus").textContent = "Comparison complete: " + d.sheetsA + " sheets in the earlier set, " + d.sheetsB + " in the later set.";
      $("results").scrollIntoView({ behavior: "smooth" });
    });
  }

  function wireDrop(zoneId, inputId, set, chipsId, statusId, refresh) {
    var zone = $(zoneId), input = $(inputId);
    zone.addEventListener("click", function () { input.click(); });
    zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", function () { zone.classList.remove("over"); });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("over");
      handleFiles(e.dataTransfer.files, set, $(chipsId), $(statusId), refresh);
    });
    input.addEventListener("change", function () { handleFiles(input.files, set, $(chipsId), $(statusId), refresh); input.value = ""; });
  }

  wireDrop("dropzoneA", "fileInputA", setA, "chipsA", "statusA", refreshA);
  wireDrop("dropzoneB", "fileInputB", setB, "chipsB", "statusB", refreshB);
  $("resetBtn").addEventListener("click", function () {
    setA.length = 0; setB.length = 0;
    $("chipsA").innerHTML = ""; $("chipsB").innerHTML = "";
    $("fileInputA").value = ""; $("fileInputB").value = "";
    $("statusA").textContent = "No files yet."; $("statusB").textContent = "No files yet.";
    $("results").style.display = "none";
  });
})();
