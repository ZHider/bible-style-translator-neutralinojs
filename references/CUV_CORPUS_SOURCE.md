# 和合本全文语料来源

本项目的全文检索与骨架审计语料使用 eBible.org 提供的《新标点和合本（简体）》USFM 数据：

- 名称：Chinese Union Version (simplified) / 新标点和合本
- 标识：`cmn-cu89s` / `CUVs`
- 来源：https://ebible.org/Scriptures/cmn-cu89s_usfm.zip
- 详情：https://ebible.org/Scriptures/details.php?id=cmn-cu89s
- 权利状态：Public Domain

运行 `powershell -ExecutionPolicy Bypass -File scripts/build-cuv-corpus.ps1` 会扫描全文每一节，并生成：

- `references/cuv-corpus/cuv-full-verses.json`：完整逐节语料，供全文审计。
- `references/cuv-corpus/cuv-usable-candidates.json`：格言、对白和故事叙事候选句索引。
- `references/cuv-corpus/cuv-extraction-stats.json`：扫描覆盖与分类数量。

“没有遗漏”在这里指：构建脚本逐节扫描语料中的全部经文，并保留完整全文以便复查；自动判断某节是否适合改写仍属于语义分类，不能宣称机器分类绝无漏判，因此完整逐节文件始终作为最终审计依据。
