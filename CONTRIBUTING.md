# Contributing

## License

Proxima is licensed under AGPL-3.0-only. See [LICENSE](LICENSE) and the
License section in [README.md](README.md).

New source files should start with:

```text
// SPDX-License-Identifier: AGPL-3.0-only
```

(Use `/* … */` in CSS and `-- …` in SQL.) Keep `"private": true` and
`"license": "AGPL-3.0-only"` in `package.json` files.

## Contributor License Agreement

Outside contributions require a signed [CLA](CLA.md) so Proxima Fitness
can dual-license the project (open-source AGPL plus commercial terms).

### One-time maintainer setup (CLA Assistant)

1. Open [cla-assistant.io](https://cla-assistant.io/) and sign in with
   GitHub.
2. Choose **Configure CLA** and select
   `proxima-fitness/proxima`.
3. Set the CLA document URL to:
   `https://github.com/proxima-fitness/proxima/blob/main/CLA.md`
4. Approve the Gist + webhook installation when prompted.

After that, new pull requests get an automated CLA check. Do not merge
outside PRs until the check is green.

### Contributors

Open a pull request as usual. When CLA Assistant comments, follow the
link and sign. Re-run with a `recheck` comment on the PR if needed.

## Secrets

Do not commit `.env`, `.env.local`, service-role keys, or personal API
tokens. Local env files are gitignored. If you need the
`resend-add-contact` database webhook Authorization header, set it in
your Supabase project (or local stack) — do not paste a real
`service_role` JWT into migrations.

Scan before publishing history:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo
```
