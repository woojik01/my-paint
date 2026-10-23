# Release QA

## Automated

Run `npm ci`, `npm run check`, `npm test`, `npm run build`.

- ZIP UTF-8/CRC, path and size guards
- Flood-fill connected regions and undo branching
- Project roundtrip with Korean names, groups, masks, opacity and blend
- Mask, clipping, visibility and group-opacity composition
- PSD decoding through independent ag-psd parser
- GIF decoding through native image decoder
- Service-worker cache inventory and required DOM IDs

## Manual — not yet verified

- [ ] New canvas opens directly with one paint layer and no workspace-type selector. Existing projects retain all groups and pixels.
- [ ] Desktop Chromium: create a canvas, draw, change color, erase, fill, undo/redo, save and reopen.
- [ ] Android: pen pressure where supported, pen-only mode, pointer cancellation, two-finger gestures, orientation changes, toolbar scrolling and layer sheet.
- [ ] Paint within a selection; move the selection; undo; clear selection. Check that mask edits stay non-destructive.
- [ ] Fill transparent and partly transparent regions at several opacity values. Unchanged pixels must retain alpha.
- [ ] Group/ungroup, reorder, clip, hide, lock, duplicate, delete and undo.
- [ ] Save and reopen multiple projects, trash one, restore it. Permanently delete only disposable QA projects.
- [ ] Force a storage failure; check that success is not displayed and project-file backup remains possible.
- [ ] Interrupt a save, reopen and test the prior recovery copy.
- [ ] Wait for offline-ready, disconnect, reload, edit, export every format, close and relaunch offline.
- [ ] In the target external editors, verify PSD group order, Unicode names, visibility, opacity and transparent edges.
- [ ] Compare PNG/WebP output, JPG background, GIF palette/alpha and SVG embedded image.
- [ ] Open parts ZIP, align PNGs using manifest information, verify group and clipping metadata.
- [ ] Test TWA association with the real distribution certificate; confirm file download/open and offline relaunch.
- [ ] Inspect all Korean/English UI strings for prohibited product wording.

## Known format tradeoffs

Static GIF uses a fixed palette and threshold alpha. SVG embeds raster content. PSD bakes masks and clipping into layer pixels; preserve the .mypaint project for editable masks. External editor visual parity still needs testing.
