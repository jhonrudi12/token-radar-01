# Token Radar

A token-launch radar for the make.fun **token-radar-01** bounty. It reads a sealed
DefiLlama snapshot of 758 protocols, ranks the ones that record no token by an implied
value for the token they might one day launch, and shows a reader how to farm each one.

## Run it

Node 22, standard library only, no network at run time:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

It writes `out/board.json` (the ranked board), `out/data.js` (the dashboard's dataset),
copies `dashboard/` and `screenshots/` into `out/`, and writes `out/dossier.json` last.

## The model — radar-2

Every rankable protocol is scored from the snapshot's own figures only, through the
tokenized protocols in its own category:

```
peerMultiple(category) = median(mcap_usd / tvl_usd) of the category's tokenized protocols,
                         each ratio winsorized at 10x, then shrunk toward the snapshot-wide
                         median with a prior weight of 4, clamped to [0.02, 3.0]
implied = round(TVL x peerMultiple x growthMult x maturityMult)
growthMult   = 1 + clamp(change_7d, -60, 120) / 100 x 0.5
maturityMult = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365 days)
```

The peer table is computed from the snapshot at run time; no protocol name is ever
special-cased. A category with few tokenized peers leans on the global median (0.2227);
a category with none uses it outright. The dashboard recomputes every row's implied
value from the peer table in `data.js` and shows whether it matches `board.json`.

A protocol is rankable when the snapshot records no token for it (no market cap, no
CoinGecko id, no symbol) and it is not an exchange, not a versioned pool of another
protocol, and not a wrapped or bridged asset — a bridge's token is the asset it wraps,
so there is no future token left to value. Staking protocols stay rankable: their receipt
token is a product, and staking protocols routinely carry a separate governance token.

## The board

239 rows on the sealed snapshot (2026-11-14): the full 40-protocol watchlist, plus 199
early rows the radar found below the $50M floor's watchlist rules. Implied values run
from $413,889 to $1,681,140,214. The 24 largest protocols whose token already trades are
set aside in the dashboard's Live token view, at the market's own value — never mixed
into the ranked board.

Each row carries a six-step farm plan, derived from the protocol's own record (category,
chains, TVL, age): a first position with its cost, a second qualifying action, a hold
period, a claim step that names only the protocol's own page, and a log step. Every step
states its cost and its time.

## Files

- `main.ts` — entrypoint: reads the snapshot, writes the board, data, dashboard, screenshots and dossier.
- `lib/model.ts` — the radar-2 model, the board builder, the farm plans, the snapshot parser.
- `vendor/makefun-board.ts` — the vendored make.fun dossier library.
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`. No network, no fonts, no images.
- `screenshots/` — board, protocol detail, filtered view, each 1440x900.

## Wording

The dashboard says a protocol "records no token". That is what the snapshot shows; it is
not proof that no token exists.
