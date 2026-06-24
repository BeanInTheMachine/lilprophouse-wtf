# Dev Duration Override

When `NEXT_PUBLIC_DEV_DURATION_MINUTES` is set in `.env`, round proposal and voting periods are shortened to the given minutes (instead of the wizard's day-based input).

## Enabling

```
# .env
NEXT_PUBLIC_DEV_DURATION_MINUTES=10
```

Restart dev server. Both proposal and voting periods become 10 minutes.

## Disabling (revert to normal)

Remove the line or set to empty, restart dev server.

## Files involved

- `app/create/round/page.tsx` — `devDuration` var at component level, used in `handleCreate` (contract deploy) and `storeRoundInDb` (DB record)
- `.env` — the toggle itself

## To fully remove this feature

1. Delete the 2 lines in `app/create/round/page.tsx` that compute `devDuration`:
   ```
   const devMinutes = process.env.NEXT_PUBLIC_DEV_DURATION_MINUTES;
   const devDuration = devMinutes ? parseInt(devMinutes) * 60 : null;
   ```
2. Revert the 2 duration args in the `createRound()` call back to `round.proposalPeriodDurationSecs` and `round.votePeriodDurationSecs`
3. Revert the `proposalEndTime` / `votingEndTime` lines in `storeRoundInDb` back to using `round.proposalPeriodDurationSecs` and `round.votePeriodDurationSecs` directly
4. Remove the env var from `.env`
