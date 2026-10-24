/* Revision Compare: PDF text extraction and sheet inventory.
   Runs in the browser via PDF.js. Nothing uploads. */
(function () {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  var SHEET_RE = /\b[ACGMEPST]-\d{3}\b/g;

  function hashText(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
  }

  function linesFromItems(items) {
    var rows = {};
    items.forEach(function (it) {
      var tr = it.transform || [0, 0, 0, 0, 0, 0];
      var y = Math.round(tr[5] / 2) * 2;
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: tr[4], str: it.str });
    });
    var ys = Object.keys(rows).map(Number).sort(function (a, b) { return b - a; });
    return ys.map(function (y) {
      return rows[y].sort(function (a, b) { return a.x - b.x; }).map(function (p) { return p.str; }).join(" ").replace(/\s+/g, " ").trim();
    }).filter(Boolean);
  }

  function inventoryPage(pageText, items, wIn, hIn) {
    var nums = pageText.match(SHEET_RE) || [];
    var sheet = nums.length ? nums[0] : null;
    var lines = linesFromItems(items);
    var title = "";
    lines.forEach(function (line) {
      if (line.length > title.length && line !== sheet && !/^\d+$/.test(line)) title = line;
    });
    var norm = pageText.toLowerCase().replace(/\s+/g, " ").trim();
    return {
      sheet: sheet,
      title: title,
      hash: hashText(norm),
      size: Math.round(wIn * 10) / 10 + "x" + Math.round(hIn * 10) / 10,
      textChars: pageText.length
    };
  }

  function analyzeOne(file) {
    return file.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: buf }).promise.then(function (pdf) {
        var jobs = [];
        for (var i = 1; i <= pdf.numPages; i++) {
          jobs.push(pdf.getPage(i).then(function (page) {
            return page.getTextContent().then(function (tc) {
              var v = page.getViewport({ scale: 1 });
              var text = tc.items.map(function (it) { return it.str; }).join(" ");
              return inventoryPage(text, tc.items, v.width / 72, v.height / 72);
            });
          }));
        }
        return Promise.all(jobs).then(function (pages) {
          var total = 0;
          pages.forEach(function (p) { total += p.textChars; });
          return { name: file.name, pages: pages, textChars: total };
        });
      });
    });
  }

  window.RevisionPDF = { analyzeOne: analyzeOne };
})();
