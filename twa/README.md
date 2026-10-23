# Android TWA packaging

The source app is installable as a PWA. A TWA Android package additionally needs a stable HTTPS deployment and its real signing certificate. No signed APK is included, because neither has been supplied yet.

1. Run `npm run build` and serve `dist/` on an HTTPS origin that you control. No backend is needed.
2. Confirm that the page, manifest, icons and service worker are accessible. Wait for the offline-ready indicator and test closing/reopening without a network.
3. Generate the website association using the SHA-256 fingerprint of the certificate that will actually sign the installed app:

```sh
node scripts/configure-twa.mjs --origin https://paint.example.com --package app.mypaint.android --fingerprint AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
```

4. Publish the generated file at `https://paint.example.com/.well-known/assetlinks.json`. Use the generated JSON; the example fingerprint above is not a real certificate.
5. In a separate Android packaging directory, use Google's Bubblewrap CLI. Initialize with your deployed manifest URL, select the same package ID, and configure signing through Bubblewrap. Keep keystores and passwords outside this repository.

```sh
npx @bubblewrap/cli init --manifest https://paint.example.com/manifest.webmanifest
npx @bubblewrap/cli build
```

6. Test the signed APK on Android: launch verification, no unexpected address bar, pen/touch input, file open/download, back navigation, rotation, background/foreground, airplane-mode restart. If an app store re-signs the app, add its actual distribution fingerprint too.

GitHub project Pages (`https://owner.github.io/my-paint/`) can host the web app, but a file under that project path does not satisfy the root `/.well-known/assetlinks.json` requirement. Arrange root-domain association separately or use a dedicated host.

TWA is browser-backed. It does not turn the website into a bundled native editor, guarantee persistent storage, or make an uncached first launch work offline. Save project-file backups.

Official documentation:
- https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
- https://github.com/GoogleChromeLabs/bubblewrap
