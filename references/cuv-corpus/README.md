# CUV corpus provenance

The JSON files in this directory are generated from the simplified Chinese
Union Version distributed by eBible.org:

- Edition: 新标点和合本 / Chinese Union Version (simplified)
- Dataset ID: `cmn-cu89s`
- Source details: <https://ebible.org/Scriptures/details.php?id=cmn-cu89s>
- Source archive: <https://ebible.org/Scriptures/cmn-cu89s_usfm.zip>
- Rights statement on the source page: Public Domain
- Source page last-updated date shown at preparation time: 2021-10-15

Generated files:

- `cuv-full-verses.json`: normalized verse records from the complete USFM corpus.
- `cuv-usable-candidates.json`: verses selected as possible aphorism, dialogue,
  or story-frame references.
- `cuv-extraction-stats.json`: extraction counts used by the regression tests.

To rebuild the derived files from the public source, run from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-cuv-corpus.ps1 -Refresh
```

These files are reference material for building and auditing the local skeleton
library. The web application does not present its output as Scripture or as an
authoritative Bible translation.
