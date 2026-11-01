<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Controle de Frota
- All team data lives in Lovable Cloud tables (managers, vehicles, expenses, checklists) readable/writable by any signed-in user; the app is a shared team tool, not per-user.
- Expenses link to vehicles by normalized plate (letters+digits, plus vehicle.linked_plates), never by FK, because spreadsheets use inconsistent plate formats.
- Live sync: `useFleetRealtime` in the authenticated layout invalidates the single `["fleet"]` query on any table change.
- Checklist reading uses a server function calling the AI gateway (Responses, strict JSON schema); photos go to the private `checklists` bucket.
- Installable on phones via manifest only (no service worker / offline).
- Manual conference points live in a shared template and item editor; unreviewed results stay null in the draft and must be explicitly reviewed before saving so no default approval is recorded.
