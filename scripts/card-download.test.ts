import assert from "node:assert/strict";
import test from "node:test";

import { buildCardDownloadFilename } from "../lib/cardDownload";

test("builds distinct scripture card filenames for repeated exports", () => {
  const first = buildCardDownloadFilename(
    "巴别塔·成篇",
    new Date("2026-07-03T00:50:12+08:00"),
    "第一篇结果",
  );
  const second = buildCardDownloadFilename(
    "巴别塔·成篇",
    new Date("2026-07-03T00:50:13+08:00"),
    "第二篇结果",
  );

  assert.match(
    first,
    /^圣经文体翻译器-巴别塔·成篇-20260703-005012-[a-z0-9]{6}\.png$/,
  );
  assert.match(
    second,
    /^圣经文体翻译器-巴别塔·成篇-20260703-005013-[a-z0-9]{6}\.png$/,
  );
  assert.notEqual(first, second);
});

test("sanitizes level titles in card download filenames", () => {
  const filename = buildCardDownloadFilename(
    "方/舟?",
    new Date("2026-07-03T00:50:12+08:00"),
    "结果",
  );

  assert.equal(filename.startsWith("圣经文体翻译器-方舟-20260703-005012-"), true);
  assert.equal(filename.endsWith(".png"), true);
});
