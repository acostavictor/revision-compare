/* Revision Compare: set diff logic. Pure functions, no DOM.
   Sheets are matched by sheet number. A renumbered sheet shows up as
   one removed plus one added, which is honest: the number is the key. */
(function (root) {
  function indexSet(files) {
    var bySheet = {}, unnumbered = [], dups = [];
    files.forEach(function (f) {
      f.pages.forEach(function (p, idx) {
        if (!p.sheet) { unnumbered.push({ file: f.name, page: idx + 1 }); return; }
        if (bySheet[p.sheet]) { dups.push(p.sheet); return; }
        bySheet[p.sheet] = { sheet: p.sheet, title: p.title, hash: p.hash, size: p.size, file: f.name, page: idx + 1 };
      });
    });
    return { bySheet: bySheet, unnumbered: unnumbered, dups: dups };
  }

  function diffSets(filesA, filesB) {
    var a = indexSet(filesA), b = indexSet(filesB);
    var added = [], removed = [], changed = [], unchanged = [];
    Object.keys(b.bySheet).forEach(function (s) {
      if (!a.bySheet[s]) { added.push(b.bySheet[s]); return; }
      var pa = a.bySheet[s], pb = b.bySheet[s];
      var titleChanged = pa.title !== pb.title;
      var sizeChanged = pa.size !== pb.size;
      var contentChanged = pa.hash !== pb.hash;
      if (titleChanged || sizeChanged || contentChanged) {
        changed.push({
          sheet: s,
          titleA: pa.title, titleB: pb.title, titleChanged: titleChanged,
          sizeA: pa.size, sizeB: pb.size, sizeChanged: sizeChanged,
          contentChanged: contentChanged,
          fileA: pa.file, fileB: pb.file, fileChanged: pa.file !== pb.file
        });
      } else {
        unchanged.push({ sheet: s, title: pb.title, file: pb.file, fileChanged: pa.file !== pb.file });
      }
    });
    Object.keys(a.bySheet).forEach(function (s) {
      if (!b.bySheet[s]) removed.push(a.bySheet[s]);
    });
    return {
      added: added, removed: removed, changed: changed, unchanged: unchanged,
      unnumberedA: a.unnumbered, unnumberedB: b.unnumbered,
      dupsA: a.dups, dupsB: b.dups,
      sheetsA: Object.keys(a.bySheet).length, sheetsB: Object.keys(b.bySheet).length
    };
  }

  root.RevisionCompare = { diffSets: diffSets };
})(typeof window !== "undefined" ? window : globalThis);
