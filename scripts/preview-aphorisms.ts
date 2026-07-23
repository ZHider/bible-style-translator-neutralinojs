import { renderCuvAphorism } from "../lib/cuvAphorismSkeletons";

const cases = [
  ["在一次失败以后仍旧耐心前行", "终必走到所盼望的地方"],
  ["贪图捷径而离开正路", "反在近处跌倒"],
  ["在患难中仍不离开朋友", "显明他的情分真实"],
  ["说话以前先想清楚", "免去日后的后悔"],
  ["每天认真工作", "终必看见劳苦的果效"],
  ["用恶意对待别人", "也从别人得着恶意"],
  ["在众人面前抬高自己", "因骄傲降为卑"],
  ["愿意饶恕别人的过错", "自己的心得自由"],
] as const;

for (const [category, result] of cases) {
  console.log(renderCuvAphorism(category, result));
}
