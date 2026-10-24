# Revision Compare

Free beta: drop in two revisions of a drawing set and see what changed. Sheets are matched by sheet number. The app reports added sheets, removed sheets, and changed sheets (content, title, page size, or file moved), plus everything it could not compare.

Nothing uploads anywhere. Everything runs in your browser via PDF.js.

## How to use it

1. Drop the earlier set into the first zone (PDFs only, as many files as the set has).
2. Drop the later set into the second zone. Comparison runs on its own once both sets have files.
3. Read the panels: Added, Removed, Changed, Unchanged, Could not compare. Print the report for a copy to work from. Click the X on a file to remove it and re-run.

## How matching works

- A sheet is identified by the first drawing number on the page matching the pattern letter-dash-three-digits (A-101, C-201, and so on).
- Two pages with the same sheet number are compared by their normalized page text (case and whitespace ignored), detected title (longest line on the page, heuristic), and page size.
- A renumbered sheet appears as one removed plus one added. That is honest: the number is the key.
- A page with no sheet number, a scanned page with no text layer, or a duplicate sheet number inside one set cannot be matched and is listed under Could not compare.

## What this is not

A text comparison, not a code review and not a substitute for a human checker. Always confirm against the sheets themselves before acting on a result.

## Files

- `index.html`: page shell.
- `styles.css`: all styling.
- `pdfextract.js`: PDF.js text extraction and per-page sheet inventory.
- `compare.js`: set diff logic (pure functions, no DOM).
- `app.js`: UI flow.

## Deploy

Any static host works, including GitHub Pages: publish the repository from the main branch, root folder, and the app lives at the repository Pages URL. No server code, no build step, no keys.
