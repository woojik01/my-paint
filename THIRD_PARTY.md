# Third-party notices

The browser application does not load external packages, remote fonts or CDN scripts. Binary encoders in app/binary.js are project code implementing published format specifications.

Development/test dependencies only (not shipped in dist):

- `@napi-rs/canvas` 0.1.80 — MIT — https://github.com/Brooooooklyn/canvas
- `ag-psd` 31.0.3 — MIT — https://github.com/Agamnentzar/ag-psd

Dependency license files are included in their packages. The lockfile pins the resolved test dependency graph. Android packaging uses Google's Bubblewrap separately and is not included in the web runtime.
