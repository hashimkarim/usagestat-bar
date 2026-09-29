# TypeSafe

Read the project-installed [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md)
when working on this project. Apply its live-documentation guidance to TypeSafe
usage tracking and Jev integrations or evaluations. Keep exact release checks
and accounting in code; use model judgments only where semantic interpretation
helps. Jev is not a desktop-control or screenshot-capture tool by itself.

Follow [TypeSafe setup and diagnostics](docs/TYPESAFE.md) for credentials and the
distinction between Jev inference and console billing. Load the local API key
only into the process that needs it. Never print it, put it in shell arguments,
commit it, or include it in fixtures, screenshots, recordings, or reports.
Do not require a live key or paid inference for ordinary tests and release gates.
