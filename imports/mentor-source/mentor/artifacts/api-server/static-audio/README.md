# Bundled static audio

This directory holds audio files that ship **inside the Docker image** so the
production API server (Railway) can play them with no external storage
dependency. Today the only consumer is the listening test feature.

```
static-audio/
└── listening/
    └── <hash>.mp3   ← 280+ files, one per unique (voice, transcript) segment
```

The `<hash>` is a 32-char prefix of
`sha256("gpt-audio|<voice>|0.92|mp3|<trimmed text>")`. It is computed
identically by:

- the runtime — `src/listening/audioCache.ts` (`segmentHash`)
- the prep script — `scripts/prepare-static-audio.ts`
- the build-time guard — `scripts/verify-static-audio.ts`

If those constants ever change, **all three files must change together**, or
every cached file becomes orphaned.

## Workflow when editing the listening test bank

Anytime you edit `src/listening/testBank.ts` — adding a test, tweaking a
transcript line, changing a voice — the set of referenced hashes changes and
the bundled `.mp3` files drift out of sync with what the runtime will request.

The build catches this for you. **`pnpm build` (root or filtered to
`@workspace/api-server`) runs `verify-static-audio.ts` as a `prebuild` step
and fails fast** if any referenced hash is missing on disk, listing each
offender with its test id, voice, and a text preview.

To fix, regenerate the bundled audio:

```bash
pnpm --filter @workspace/api-server exec tsx scripts/prepare-static-audio.ts
```

The prep script is idempotent — it skips segments already on disk, downloads
from Replit Object Storage when available, and only falls back to OpenAI TTS
for genuinely new segments. Then commit the new `.mp3` files alongside your
test-bank change.

## Manual verification

Run the guard on its own without doing a full build:

```bash
pnpm --filter @workspace/api-server run verify:static-audio
```

Exit code 0 means every referenced segment is bundled. Non-zero means the
build will fail until you re-run the prep script.

## Why we don't auto-run the prep script during build

Because TTS generation calls the OpenAI API. We don't want every CI build to
require an OpenAI key and burn budget regenerating files that should already
be on disk and committed to git. The guard catches the drift; the developer
who edited the test bank pays the (usually tiny) cost of running the prep
script once and committing the resulting files.

## Orphaned files

`verify-static-audio.ts` deliberately does **not** flag `.mp3` files that
exist on disk but are no longer referenced by the test bank — those are
harmless to ship (a few extra KB in the image) and removing them is a
separate cleanup concern handled elsewhere. Only missing files break
playback, so only missing files block the build.
