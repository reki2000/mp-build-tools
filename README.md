# mp-build-tools

Shared Flutter build, test, release and Pages workflows. Pin consumers to a reviewed commit SHA. Defaults: the SDK in [.flutter-version](.flutter-version), root `pubspec.yaml` version, application at `.`, 90-day artifacts.

## Build

```yaml
jobs:
  ci:
    permissions:
      contents: write
    uses: reki2000/mp-build-tools/.github/workflows/build.yaml@<commit-sha>
    with:
      artifact-name: my-app
      app-directory: example # Omit for a root application.
      exclude: '["windows-arm64"]' # Or include: '["android", "web"]'.
```

Define push/PR/manual triggers and cancellation in the caller. Keep project test commands in `.github/scripts/test.sh`, accepting `vm`, `js` and `wasm`; call `$MP_BUILD_SCRIPTS/test.sh <flutter|dart> <runtime> [paths...]` for shared flags and Flutter VM/browser suite selection. See [fnesemu](https://github.com/reki2000/fnesemu/pull/108/files), [picker](https://github.com/reki2000/mp_bigfile_picker/pull/3/files) and [audio](https://github.com/reki2000/mp-audio-stream/pull/41/files).

- [platforms.json](platforms.json) owns build IDs, runners and test hosts. Empty filters select all; `include` and `exclude` are mutually exclusive JSON arrays. Unknown IDs, duplicates and an empty selection fail.
- Tests run on every host needed by the selected platforms; universal macOS includes Intel and ARM64. Selecting Web also runs portable Chrome JS/Wasm tests on those hosts. Set `web-javascript: false` to test and distribute Wasm only; Flutter still compiles its default JS fallback, which is removed before packaging. Filesystem/tool tests stay on the VM.
- PR/develop builds Web. Main/manual builds every selected platform. Add `ci:full` for native PR builds and remove it after verification.
- Mobile binaries are compiled; mocked unit/widget tests do not validate device dialogs, audio hardware or provisioning. Verify those internally before tagging.
- Pages deploys successful push builds: main at `/`, develop at `/develop/`; PR uses a dry run and manual runs do not deploy. Both paths use the same portable Web ZIP. Existing `develop/` and `CNAME` are retained.

## Release

Download the `release-*` artifacts from a successful full main/manual run, verify internally, then tag that exact commit with its root version excluding `+build`:

```sh
git tag v1.0.0 <verified-commit-sha>
git push origin v1.0.0
```

Call [.github/workflows/release.yaml](.github/workflows/release.yaml) with `tag`, `artifact-name` and optional `build-run-id`, granting `actions: read` and `contents: write`. It checks the source commit, successful main/manual run, recorded platform selection, complete artifacts and digests, then publishes after every upload succeeds. Binaries are never rebuilt or re-signed. Checksums and build metadata accompany assets; published releases are retained. Expired artifacts require rebuilding and internal verification.

## Signing and installation

Map these optional repository secrets explicitly into the build workflow; configure all four for a platform. PR builds skip release signing, partial configuration fails, and signing files are cleaned afterward.

- Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (JKS/PKCS12).
- iOS: `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROFILE_BASE64`, `IOS_EXPORT_OPTIONS_BASE64` (distribution P12, matching profile and ExportOptions.plist).

| Target | Distribution |
|---|---|
| Android | ARM32/ARM64/x86-64 APKs and store AAB; use a persistent key for installable updates. Default keys are temporary. |
| iOS | IPA; unsigned files require signing, signed files follow the provisioning profile. |
| iOS simulator | ARM64 debug app ZIP; install with `xcrun simctl install`. |
| macOS | Universal app ZIP, ad-hoc signed without notarization. |
| Windows / Linux | x64/ARM64 archives; extract the entire directory and run the executable. |
| Web | Wasm with JavaScript fallback; serve over HTTP(S), not `file://`. |

Standalone Actions remain available: [flutter-build](flutter-build/action.yml), [setup-flutter](setup-flutter/action.yml), [build-plan](build-plan/action.yml), [read-version](read-version/action.yml), [release-binaries](release-binaries/action.yml), [deploy-pages](deploy-pages/action.yml). Reusable workflows use GitHub.com's `$/` self references so internal Actions follow the same pinned commit.
