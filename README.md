# mp-build-tools

Shared Flutter build, release and GitHub Pages Actions. Defaults: Flutter 3.47.5, root `pubspec.yaml` version, `app-directory: .`, artifacts kept for 90 days.

| Action | Purpose | Job permissions |
|---|---|---|
| `flutter-build` | Build one target and upload binaries | `contents: read` |
| `read-version` | Read the root version and numeric build name | `contents: read` |
| `release-binaries` | Publish verified CI binaries | `actions: read`, `contents: write` |
| `deploy-pages` | Deploy the current Web artifact | `contents: write` |

Check out the application first; pin Actions to a reviewed SHA. `flutter-build` needs `target` and `artifact-name`, plus `architecture` for native jobs. Set `app-directory: example` for plugin samples. Inputs are documented in each `action.yml`. Update consumer pins together after full CI passes.

Consumers: [fnesemu](https://github.com/reki2000/fnesemu/pull/108/files), [mp_bigfile_picker](https://github.com/reki2000/mp_bigfile_picker/pull/3/files), [mp-audio-stream](https://github.com/reki2000/mp-audio-stream/pull/41/files).

## Build and release

- PR/develop: tests and Web. Main/manual: all platforms. Use `ci:full` for native PR builds; remove it after verification.
- Download `release-*` artifacts from a successful full main/manual run and verify the binaries internally. PR builds cannot be released.
- Commit version changes before building, then tag that exact verified commit with the root version, excluding `+build`:

```sh
git tag v1.0.0 <verified-commit-sha>
git push origin v1.0.0
```

`release-binaries` takes `tag`, `artifact-name` and optional `build-run-id`. Check out the existing tag first. It verifies the full-build marker, source commit, all nine artifacts and digests, then uploads and publishes a draft. No rebuilding or re-signing occurs. Published releases are retained; checksums and source metadata accompany the assets. Expired artifacts need a new build and verification.

To select a verified run manually:

```sh
gh workflow run release.yaml -f tag=v1.0.0 -f build_run_id=<verified-run-id>
```

## Signing and installation

Pass these repository secrets through the matching [Action inputs](flutter-build/action.yml); set all four for each platform:

- Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- iOS: `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROFILE_BASE64`, `IOS_EXPORT_OPTIONS_BASE64`.

Android needs a base64 JKS/PKCS12 keystore. iOS needs a distribution P12, its password, an explicit app provisioning profile and matching ExportOptions.plist. Partial configuration fails. PR builds ignore signing inputs; signing files are cleaned after building.

| Target | Output and installation |
|---|---|
| Android / all | ARM32, ARM64 and x86-64 APKs; install the matching APK. AAB is for stores. Default test keys cannot reliably update an installation; use a persistent key for distribution. |
| iOS / ARM64 | IPA; unsigned files need signing. Signed files follow the provisioning profile. |
| iOS simulator / ARM64 | Debug app ZIP; `xcrun simctl install booted <app-path>`. |
| macOS / universal | Intel/Apple Silicon app ZIP; ad-hoc signed, without notarization. |
| Windows / x64, ARM64 | Extract the entire ZIP and run the EXE; runtime DLLs are included. |
| Linux / x64, ARM64 | Extract the tar.gz; GTK 3/audio libraries are required. Built on Ubuntu 22.04. |
| Web | Extract and serve over HTTP(S); file access may need HTTPS or localhost. |

## Pages

Run `deploy-pages` after successful tests/builds in a serialized job. Use `target-folder: develop` for develop or an empty folder for stable. `dry-run` defaults to true; set false only for main/develop push deployments.

After the first deployment, select **Settings > Pages > Deploy from a branch > gh-pages / (root)**. Cleanup preserves develop and custom-domain metadata. Open directory URLs with a trailing slash; both paths share browser storage.
