# Workflow Rules

## Feature workflow

For any new feature/page/module:

1. **Spec** — write the spec first.
2. **Build (plan)** — override old `tasks/todo.md` and `tasks/plan.md` with the new task breakdown.
3. **Build (execute)** — implement in multiple steps, verifying as you go.
4. **Update spec** — reflect the final state in `/docs/specs/*`.
5. **Update docs** — reflect the final state in `/docs/documents/*`.
6. **Clean up** — delete the completed spec from `/specs/*.md`.
7. **Complete** — workflow done.

## Module rules

- Build each feature as its own module (same convention as `src/modules/*`).
- A module file must be **max 500 lines**. If it grows past that, break it into smaller files.
- Each module must be independent of other modules (no tight coupling between module internals).

## Root docs

- `SPEC.md` and `CLAUDE.md` only contain guidance pointing to module files — not the module details themselves.
- Keep `SPEC.md` as small as possible: once a feature's details are fully captured in `/docs/documents/*`, remove that feature's section from `SPEC.md` rather than letting it accumulate already-documented content.

## Commit rules

- Always ask the user before committing — never run `git commit` without explicit confirmation for that commit. Confirmation means showing the exact staged file list and the full commit message and getting a yes on that — agreeing to a commit *strategy* (e.g. how many commits, how they're grouped) is not the same as confirming the commit itself.
- Always remove `Co-Authored-By` from commit messages.
- Reference the `/git-commit` skill for commit message format.
- During `/build`, don't commit after every single spec/task file — batch commits at feature/checkpoint boundaries (e.g. a "Checkpoint" line in `tasks/plan.md`/`tasks/todo.md`, or a full Phase) instead. Still verify (tests, build) after each task; only the commit frequency is batched.

## Formatting

- All changed `.js`, `.ts`, `.tsx` files must be run through Prettier before testing or committing.

## Naming convention

- Use clear, unambiguous names.

## Unclear issues

- If a requirement or issue is unclear, always ask the user before proceeding.
