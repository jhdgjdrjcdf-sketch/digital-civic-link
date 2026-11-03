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

## Rules
- Every route sets `staticData.sitemap`; `/sitemap.xml` is built from the router plus published news, events and courses, so private pages must set it to false.
- Detail routes load a small public record in `loader` (src/lib/page-meta.ts) so `head()` can emit page-specific titles, canonical and JSON-LD during SSR.
