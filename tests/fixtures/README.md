# Provider fixtures

Responses recorded from the real APIs on 10 November 2026 and replayed by the tests
(`tests/helpers.tsx`) and the browser checks (`scripts/lib/harness.mjs`) through
`providers.mjs`. Nothing here is hand-written Quran text.

| File | Recorded from |
| --- | --- |
| `surah-list.json` | `GET api.alquran.cloud/v1/surah` |
| `surah-{1,112,113,114}-{ar,en,ur}.json` | `GET /v1/surah/{n}/editions/quran-uthmani[,en.sahih \| ,ur.jalandhry]` |
| `ayah-2-255.json`, `ayah-3-159.json` | `GET /v1/ayah/{ref}/editions/quran-uthmani,en.sahih,ur.jalandhry` (3:159 is the daily verse for the fixed test date) |
| `editions-{en,ur}.json` | `GET /v1/edition/language/{lang}` |
| `meta.json` | `GET /v1/meta`, reduced to the juz references |
| `search-daybreak-en.json`, `search-empty.json` | `GET /v1/search/{keyword}/all/en.sahih` (a hit, and the 404 the API returns for no matches) |
| `timings-karachi-2026-11-{10,11}.json`, `timings-london-2026-11-10.json` | `GET api.aladhan.com/v1/timings/{date}?…&iso8601=true` |
| `silence.mp3` | Generated two-second tone standing in for a recitation file |

`npm run verify:live` re-fetches several of these and fails if the live responses have
drifted from the recordings.
