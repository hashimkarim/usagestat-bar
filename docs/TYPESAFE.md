# TypeSafe and Jev

The [TypeSafe skill](../.agents/skills/typesafe-ai/SKILL.md) is installed for
Codex in this project, pinned by `skills-lock.json`. It was installed using:

```sh
npx skills add typesafe-ai/skills --skill typesafe-ai --agent codex --yes
```

New Codex turns discover the installed skill. Read its linked live documentation
before changing an integration. Jev supplies typed judgments; our desktop lab
still owns UI interaction, screenshots, video capture and deterministic checks.

## Local API key

Store the Jev key outside the repository in:

```text
~/.config/usagestat-bar/secrets/typesafe.env
```

Use a directory readable only by your user (`0700`) and a file readable/writable
only by your user (`0600`). The file contains:

```dotenv
TYPESAFE_API_KEY=your-key-here
```

Edit this file locally, then tell the agent the key is ready. Do not paste the
key into the conversation. The agent must read the value privately and inject
it into the environment of the specific integration process, without logging
it or passing it as a command-line argument. This file is not automatically
loaded by the bar or SDK. The variable name follows the
[TypeSafe SDK documentation](https://docs.typesafe.ai/sdk/python).

For a future CI evaluation, use a GitHub Actions secret named
`TYPESAFE_API_KEY`, passed only to the job that needs it. Native release evidence
and normal tests remain credential-free.

## Usage tracking uses a different credential

The `usagestat` backend has a `typesafe` provider with `auto`/`web` sources.
It reads account spending and credit balance from the console billing page,
using a saved `cookieHeader` or `TYPESAFE_COOKIE`. Configure it under Providers
in the bar's preferences; newly discovered providers appear under Plugin
Providers. Enable TypeSafe, select `web` or `auto`, and use the masked Cookie
header field. Keep an existing working cookie when diagnosing a blocked request.

The Jev API key authorizes inference. The documented
[System One response](https://docs.typesafe.ai/api) reports input/output tokens
for that request; it does not document an account billing/balance endpoint.
Adding the API key therefore does not replace the billing cookie or guarantee
that account tracking works.

## September 29, 2026 investigation

The installed backend, `2.0.0-alpha.4`, included TypeSafe. The normal desktop
configuration already enabled it and contained a saved cookie. A live billing
GET returned HTTP 403 with a Cloudflare **Attention Required** page, not a
confirmed expired-session response. The old parser reported “session expired”
for every 403. The backend adapter now identifies Cloudflare protection pages
before that parser and reports a failed request without claiming the login is
invalid. It does not retry or attempt to bypass the protection.

Live account tracking remains unverified while that block persists. Open the
TypeSafe console in a normal browser to check access. If it works in the browser
but blocks the backend, a supported billing API or provider-approved automated
access is needed; changing the Jev key alone will not resolve it.

The bar preserves spending, balance and billing details as text. GNOME now
shows `—` when no quota percentage is supplied, keeps the provider logo visible,
and avoids empty/full quota meters and threshold notifications for absent data.
The other Linux clients already use an unavailable percentage in this case.

Regression coverage uses synthetic billing and protection responses through the
CLI adapter, Linux model and isolated GNOME session. It requires no credentials.
Use `tests/run.sh`, `tests/linux/run.sh` and `test-nested.sh` to run it.

When probing a live configuration, pass `--config` explicitly if the agent's
`XDG_CONFIG_HOME` differs from the desktop's. A separate empty configuration
can otherwise make an enabled provider appear disabled. Do not publish raw
configuration, response bodies or live billing values as test artifacts.
