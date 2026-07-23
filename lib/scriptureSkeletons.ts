import {
  renderCuvAphorism,
  renderCuvStoryAphorism,
} from "@/lib/cuvAphorismSkeletons";
import { buildCuvStoryTemplatePrompt } from "@/lib/cuvStoryTemplates";

export const SPEECH_INTENT_IDS = [
  "welcome",
  "waited_arrival",
  "guide_inside",
  "invite_seat",
  "introduction",
  "courtesy_gift",
  "courtesy_refusal",
  "self_identification",
  "reputation",
  "offer_help",
  "reassurance",
  "approval",
  "infer_motive",
  "request_directness",
  "conditional_commitment",
  "mediation_request",
  "mutual_claim",
  "self_defense",
  "status_observation",
  "insult_challenge",
  "rebuke",
  "paired_dominance",
  "face_boundary",
  "relay_request",
  "warning_pride",
  "youth_defiance",
  "exit_threat",
  "method_challenge",
  "coercion",
  "boast",
  "death_threat",
  "request",
  "refusal",
  "command",
  "promise",
  "question",
  "contrast",
  "general_rule",
  "guarantee",
  "trade_price",
  "curse_penalty",
  "agreement",
  "disagreement",
] as const;

export const NARRATION_FRAME_IDS = [
  "arrival",
  "setting",
  "action",
  "reaction",
  "indirect_speech",
  "introduction",
  "transition",
  "outcome",
] as const;

type SpeechIntentId = (typeof SPEECH_INTENT_IDS)[number];
type NarrationFrameId = (typeof NARRATION_FRAME_IDS)[number];
type SkeletonSlots = Record<string, string>;
type SpeechDelivery = "said" | "answered" | "asked" | "warned" | "commanded" | "cried";

export type ScriptureSkeletonUnit =
  | {
      kind: "narration";
      frame: NarrationFrameId;
      actor?: string;
      target?: string;
      action?: string;
      object?: string;
      place?: string;
      time?: string;
      matter?: string;
      result?: string;
    }
  | {
      kind: "speech";
      intent: SpeechIntentId;
      speaker: string;
      addressee?: string;
      delivery?: SpeechDelivery;
      elements: SkeletonSlots;
    }
  | {
      kind: "declaration";
      intent: SpeechIntentId;
      elements: SkeletonSlots;
    };

export type ScriptureSkeletonPlan = {
  textType: string;
  units: ScriptureSkeletonUnit[];
};

const SPEECH_INTENT_SET = new Set<string>(SPEECH_INTENT_IDS);
const NARRATION_ID_SET = new Set<string>(NARRATION_FRAME_IDS);

function cleanSlot(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[“”"‘’']/gu, "")
    .replace(/[。！？!?；;]+$/gu, "")
    .replace(/[\r\n]+/gu, "，")
    .replace(/给脸不要脸/gu, "轻看所受的情面")
    .replace(/你算什么东西|算什么东西/gu, "究竟是什么人")
    .replace(/太客气|过于客气/gu, "所行的礼数过重")
    .replace(/小意思/gu, "微薄之物")
    .replace(/有头有脸/gu, "有名望")
    .replace(/开裆裤/gu, "年幼无知")
    .replace(/撒泡尿照照(?:自己)?/gu, "察看自己")
    .replace(/善罢甘休/gu, "止息追讨")
    .replace(/痛快[、，,]?喜欢这(?:种)?脾气|喜欢这(?:种)?痛快脾气/gu, "你口中这痛快的话")
    .replace(/不可不要|不可不再|不要再不要/gu, "不可再")
    .replace(/再{2,}/gu, "再")
    .replace(/全无气盛/gu, "不气盛")
    .replace(/我弄死你|弄死你/gu, "夺取你的命")
    .replace(/请坐|坐坐坐/gu, "坐席")
    .replace(/挑明了说|有话直说|只管直说/gu, "将这事陈明")
    .replace(/放在桌上|摆在桌上/gu, "摆在席前")
    .replace(/桌上|桌子上/gu, "席前")
    .replace(/饭店雅间|饭店包间|雅间|包间/gu, "摆设筵席的屋里")
    .replace(/那饭店|饭店/gu, "那摆设筵席的地方")
    .replace(/那摆设筵席的地方/gu, "那摆设筵席的屋里")
    .replace(/服务员/gu, "伺候筵席的人")
    .replace(/地板上|地板/gu, "地上")
    .replace(/示意/gu, "转眼看")
    .trim()
    .slice(0, maxLength);
}

function cleanElements(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, cleanSlot(item)] as const)
      .filter(([, item]) => item && !/^(?:哎|喂|啊|呀|唉)+$/u.test(item)),
  );
}

export function parseScriptureSkeletonPlan(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const value = parsed as { textType?: unknown; units?: unknown };
  if (!Array.isArray(value.units)) return null;
  const units: ScriptureSkeletonUnit[] = [];

  for (const rawUnit of value.units.slice(0, 100)) {
    if (!rawUnit || typeof rawUnit !== "object" || Array.isArray(rawUnit)) continue;
    const unit = rawUnit as Record<string, unknown>;
    if (unit.kind === "narration") {
      units.push({
        kind: "narration",
        frame: NARRATION_ID_SET.has(String(unit.frame))
          ? (String(unit.frame) as NarrationFrameId)
          : "action",
        actor: cleanSlot(unit.actor, 50),
        target: cleanSlot(unit.target, 50),
        action: cleanSlot(unit.action, 180),
        object: cleanSlot(unit.object, 100),
        place: cleanSlot(unit.place, 80),
        time: cleanSlot(unit.time, 80),
        matter: cleanSlot(unit.matter, 180),
        result: cleanSlot(unit.result, 180),
      });
      continue;
    }
    if (unit.kind === "speech") {
      const speaker = cleanSlot(unit.speaker, 50);
      if (!speaker) continue;
      const delivery: SpeechDelivery = ["said", "answered", "asked", "warned", "commanded", "cried"].includes(
        String(unit.delivery),
      )
        ? (String(unit.delivery) as SpeechDelivery)
        : "said";
      const fallbackIntent: SpeechIntentId =
        delivery === "asked"
          ? "question"
          : delivery === "commanded" || delivery === "warned"
            ? "command"
            : "contrast";
      const elements = cleanElements(unit.elements);
      const requestedIntent = SPEECH_INTENT_SET.has(String(unit.intent))
        ? (String(unit.intent) as SpeechIntentId)
        : fallbackIntent;
      const questionText = [elements.question, elements.action]
        .filter(Boolean)
        .join("，");
      const intent =
        requestedIntent === "question" && /(?:怎样|怎么|如何).{0,12}(?:走出|出去|离开)/u.test(questionText)
          ? "method_challenge"
          : requestedIntent;
      units.push({
        kind: "speech",
        intent,
        speaker,
        addressee: cleanSlot(unit.addressee, 50),
        delivery,
        elements,
      });
      continue;
    }
    if (unit.kind === "declaration") {
      units.push({
        kind: "declaration",
        intent: SPEECH_INTENT_SET.has(String(unit.intent))
          ? (String(unit.intent) as SpeechIntentId)
          : "general_rule",
        elements: cleanElements(unit.elements),
      });
    }
  }

  if (!units.length) return null;
  return {
    textType: cleanSlot(value.textType, 60) || "记事",
    units,
  } satisfies ScriptureSkeletonPlan;
}

function element(elements: SkeletonSlots, key: string, fallback: string) {
  return cleanSlot(elements[key]) || fallback;
}

function targetName(elements: SkeletonSlots) {
  return element(elements, "target", "你")
    .replace(/^(?:我要|我必)?(?:弄死|杀死|夺取)/u, "")
    .replace(/的命$/u, "")
    .replace(/^(你|我|他|她|它)的$/u, "$1") || "你";
}

function collapseRepeatedText(value: string) {
  let result = value;
  for (let index = 0; index < 3; index += 1) {
    result = result
      .replace(/^(凡|若|你今日|我必|我当怎样|也当|也得|不可)\1+/gu, "$1")
      .replace(/([\p{Script=Han}]{2,10})\1+/gu, "$1")
      .replace(/呢呢$/gu, "呢")
      .replace(/也多也多$/gu, "也多");
  }
  return result.trim();
}

function strippedElement(
  elements: SkeletonSlots,
  key: string,
  fallback: string,
  patterns: RegExp[] = [],
) {
  let value = collapseRepeatedText(element(elements, key, fallback));
  for (const pattern of patterns) value = value.replace(pattern, "");
  return collapseRepeatedText(value).replace(/^[，；：、\s]+|[，；：、\s]+$/gu, "") || fallback;
}

function normalizePossession(value: string, speaker = "", addressee = "") {
  return value
    .replace(new RegExp(`^${addressee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}的`, "u"), "你的")
    .replace(new RegExp(`^${speaker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}的`, "u"), "我的");
}

function renderSpeech(
  intent: SpeechIntentId,
  elements: SkeletonSlots,
  context: {
    speaker?: string;
    addressee?: string;
    occurrence?: number;
    aphorismMode?: boolean;
    storyAnchorMode?: boolean;
  } = {},
) {
  switch (intent) {
    case "welcome":
      return `请进，为什么站在外边呢？屋里已经预备了坐席。`;
    case "waited_arrival":
      return `我们等候你多时了，如今你果然来到。`;
    case "guide_inside":
      return `你们来，进到那屋，在所预备的地方坐席。`;
    case "invite_seat":
      return `你们来，在我们中间坐席；所预备的地方就在这里。`;
    case "introduction": {
      const rawCount = strippedElement(elements, "count", "几");
      const count = /(?:^|[^十])(?:2|二|两)|两个/u.test(rawCount)
        ? "两"
        : /(?:1|一)|一个/u.test(rawCount)
          ? "一"
          : rawCount.replace(/个|人/gu, "") || "几";
      const names = strippedElement(elements, "names", "他们的名字已经陈明");
      const rawRelation = strippedElement(elements, "relation", "与我同来的人");
      const relation = /^(?:兄弟|朋友|同伴|同事)$/u.test(rawRelation)
        ? `我的${rawRelation}`
        : rawRelation;
      return count === "一"
        ? `论到这一个人，他名叫${names}；他乃是${relation}。`
        : `论到这${count}个人，他们名叫${names}；他们乃是${relation}。`;
    }
    case "courtesy_gift":
      return `金银般贵重的物我没有；只把我手中所有的${strippedElement(elements, "gift", "微薄之物", [/^(?:一点|一些)/u])}给你。`;
    case "courtesy_refusal":
      return context.occurrence
        ? `这不是外人彼此所行的礼，乃是${element(elements, "relation", "弟兄")}之间的情分；不可再看为贵重。`
        : `我实在告诉你，你所行的礼数已经足了；我们原是${element(elements, "relation", "弟兄")}，这礼不可再加重。`;
    case "self_identification":
      return `论到我的名，人所称呼我的名乃是${strippedElement(elements, "name", "这人", [/^(?:我是|我叫|我名叫|人称我)/u])}。`;
    case "reputation":
      return `你的美名已经传在众人中间，胜过许多财物；我也听见人说，你${strippedElement(elements, "qualities", "所行的有情有义", [/^你/u])}。`;
    case "offer_help":
      return `你若向我求什么事，只管告诉我；凡我手所能行的，我必为你成就。`;
    case "reassurance":
      return `${strippedElement(elements, "basis", "你所说的话", [/^有了?/u, /^听了?/u])}坚立在我面前，我的心便安稳，不至摇动。`;
    case "approval":
      {
        const quality = strippedElement(elements, "quality", "你口中这痛快的话");
        const normalizedQuality = /痛快|爽快|喜欢.*脾气|直爽的性情|^(?:脾气|性情)$/u.test(quality)
          ? "你口中这痛快的话"
          : quality;
        return `你既将话陈明，这在我眼中看为甚好；我所喜悦的，正是${normalizedQuality}。`;
      }
    case "infer_motive":
      return `你今日召我来，岂只是为${strippedElement(elements, "surface", "坐席吃喝")}吗？你心中若有${strippedElement(elements, "matter", "别的事", [/^必定有/u])}，只管向我陈明。`;
    case "request_directness":
      return `你若有什么话，只管陈明；是，就说是，不是，就说不是。`;
    case "conditional_commitment":
      return `凡我所能行的，我必${strippedElement(elements, "action", "为你成就", [/^我必/u])}；若有我不能行的，求你${strippedElement(elements, "allowance", "体谅我的难处")}。`;
    case "mediation_request": {
      const beneficiary = element(elements, "beneficiary", "这人");
      const action = strippedElement(elements, "action", "应允我所求的", [/^(?:求你)?/u]).replace(
        /(?:寻找|找|追讨)他/u,
        (match) => match.replace(/他$/u, beneficiary),
      );
      const result = strippedElement(elements, "result", "", [/^(?:好叫)?/u]);
      if (/情面|面子/u.test(result)) {
        return `我若在你眼前蒙恩，求你看我的情面，${action}。`;
      }
      return `我若在你眼前蒙恩，求你因${beneficiary}的缘故，${action}${result && result !== beneficiary ? `，好叫${result}` : ""}。`;
    }
    case "mutual_claim": {
      const theirs = normalizePossession(
        strippedElement(elements, "theirs", "你所看重的人"),
        context.speaker,
        context.addressee,
      ).replace(/^[\p{Script=Han}A-Za-z·]{2,8}的/u, "");
      const mine = normalizePossession(
        strippedElement(elements, "mine", "我所看重的人"),
        context.speaker,
        context.addressee,
      ).replace(/^[\p{Script=Han}A-Za-z·]{2,8}的/u, "");
      return `你有${theirs.replace(/^你的/u, "")}，我也有${mine.replace(/^我的/u, "")}。`;
    }
    case "self_defense":
      return `我实在告诉你，${element(elements, "matter", "这事")}，我不是${strippedElement(elements, "rejected", "有意亏负人")}，乃是${element(elements, "asserted", "暂且如此行")}。`;
    case "status_observation":
      return `你的美名胜过大财；你的名已经传在众人中间，${strippedElement(elements, "supporters", "尊重你的人", [/也多$/u])}也多。`;
    case "insult_challenge": {
      const knownA = strippedElement(elements, "knownA", "我哥哥", [/我认识$/u]);
      const knownB = strippedElement(elements, "knownB", "他的名望", [/我也知道$/u]);
      const challenge = strippedElement(elements, "challenge", "在我哥哥面前如此说话", [
        /^究竟是什么人[？?]?/u,
        /你察看自己(?:呢)?$/u,
      ]);
      const plausibleKnownNames = [knownA, knownB].every(
        (value) =>
          /^[\p{Script=Han}A-Za-z·]{2,8}$/u.test(value) &&
          !/我哥|哥哥|兄长|道上|混时|年幼|无知|名望|穿|^你$|^我$/u.test(value),
      );
      if (!plausibleKnownNames) {
        const challenged = context.addressee || "这人";
        return `${challenged}是谁？他算什么人，竟敢${challenge}呢？`;
      }
      if (/^(?:我哥|我哥哥|哥哥|兄长)$/u.test(knownA)) {
        return `我哥哥的名我知道，他的名望我也晓得；你却是谁，竟敢${challenge}呢？`;
      }
      return `${knownA}我认识，${knownB === "你" || knownB === context.addressee ? "他的名望" : knownB}我也知道；你却是谁，竟敢${challenge}呢？`;
    }
    case "rebuke": {
      const rawProhibition = strippedElement(elements, "prohibition", "再以无礼的话待人", [
        /^(?:(?:不可|不要)\s*)+/u,
        /^(?:哎|喂|啊|呀|唉)+$/u,
      ]);
      const prohibition = /^(?:住口|止住(?:你的)?口|闭口|闭嘴)$/u.test(rawProhibition)
        ? "再说无礼的话"
        : rawProhibition;
      return `你当止住你的口；不可${prohibition}。`;
    }
    case "paired_dominance": {
      const all = Object.values(elements).join("，");
      if (/龙/u.test(all) && /虎/u.test(all)) {
        return "凡自称为龙的，必叫他盘着；凡自称为虎的，也必叫他卧着。";
      }
      return `凡${strippedElement(elements, "categoryA", "属于第一等", [/^凡/u, /的$/u])}的，必${strippedElement(elements, "resultA", "照第一等而行", [/^必/u])}；凡${strippedElement(elements, "categoryB", "属于第二等", [/^凡/u, /的$/u])}的，也必${strippedElement(elements, "resultB", "照第二等而行", [/^(?:也)?必/u])}。`;
    }
    case "face_boundary":
      return `你用情面待我，我也用情面待你；因为你用什么量器量给我，我也用什么量器量给你。`;
    case "relay_request":
      return `求你将这话传给${element(elements, "target", "那人")}，叫他亲自到我这里来说明这事。`;
    case "warning_pride":
      return `凡自高的，必降为卑；你不可${strippedElement(elements, "warning", "过于气盛", [/^年轻人[，,]?不可/u, /^不可/u])}。`;
    case "youth_defiance":
      return `不可叫人小看我年轻；我若不${/气盛/u.test(element(elements, "quality", "气盛")) ? "气盛" : strippedElement(elements, "quality", "有胆气", [/^不/u])}，还算什么年轻人呢？`;
    case "exit_threat":
      return `你今日若${strippedElement(elements, "condition", "这样离去", [/^(?:你今日)?若/u, /^今日/u])}，我必追讨这事，断不止息。`;
    case "method_challenge":
      return `依你所说，我当怎样${strippedElement(elements, "action", "离开这里", [/^我当怎样/u, /[呢吗么]+$/u])}呢？`;
    case "coercion": {
      const positive = strippedElement(elements, "positiveCondition", "愿意答应", [/^答应$/u]);
      const negative = strippedElement(elements, "negativeCondition", "不愿答应", [/^不答应$/u]);
      const rawResult = strippedElement(elements, "result", "答应", [/^(?:也得|也当)/u]);
      const result = /答应/u.test(rawResult) ? "答应" : rawResult;
      return `今日所议的，是，就说是；不是，就说不是；然而无论你${positive}或${negative}，都必要${result}。`;
    }
    case "boast":
      return `从我幼年直到今日，从来没有人像你这样${strippedElement(elements, "action", "在我面前说话", [/^我长到这么大[，,]?还没有人敢/u, /^未曾有人敢/u, /^这样/u, /呢$/u])}。`;
    case "death_threat":
      {
        const target = targetName(elements);
        const renderedTarget = context.addressee && target === context.addressee ? "你" : target;
        return `我必夺取${renderedTarget}的命。`;
      }
    case "request":
      return `我若在你眼前蒙恩，求你${strippedElement(elements, "action", "应允我所求的", [/^求你/u])}，好叫${strippedElement(elements, "result", "这事得以成就", [/^好叫/u])}。`;
    case "refusal":
      return `论到${element(elements, "matter", "这事")}，我断不${strippedElement(elements, "action", "照此而行", [/^我断不/u])}。`;
    case "command":
      return `你当${strippedElement(elements, "action", "照所吩咐的行", [/^你当/u])}；不可${strippedElement(elements, "prohibition", "违背这话", [/^不可/u])}。`;
    case "promise":
      return `我必照你所说的${strippedElement(elements, "action", "去行", [/^我必照(?:你)?所说的/u])}。`;
    case "question":
      {
        const rawQuestion = element(elements, "question", "当察看这事");
        const method = rawQuestion.match(/(?:我当)?(?:怎样|怎么|如何)(.{0,24}?(?:走出|出去|离开).*)/u);
        if (method) {
          return `依你所说，我当怎样${method[1].replace(/[呢吗么？?]+$/u, "")}呢？`;
        }
        const question = strippedElement(elements, "question", "当察看这事", [
          /^岂不/u,
          /[呢吗么]+$/u,
        ]);
        const more = strippedElement(elements, "more", "", [/^何况/u, /[呢吗么]+$/u]);
        return more && !/事情已经显明/u.test(more)
          ? `岂不${question}吗？何况${more}呢？`
          : `岂不${question}吗？`;
      }
    case "contrast":
      return `这不是${strippedElement(elements, "rejected", "人所猜想的", [/^这不是/u])}，乃是${strippedElement(elements, "asserted", "事情真实的缘故", [/^乃是/u])}。`;
    case "general_rule":
      if (/龙/u.test(Object.values(elements).join("，")) && /虎/u.test(Object.values(elements).join("，"))) {
        return "凡自称为龙的，必叫他盘着；凡自称为虎的，也必叫他卧着。";
      }
      if (context.aphorismMode) {
        const category = strippedElement(elements, "category", "如此行", [/^凡/u, /的$/u]);
        const result = strippedElement(elements, "result", "得着相应的结果", [/^必/u]);
        return context.storyAnchorMode
          ? renderCuvStoryAphorism(category, result)
          : renderCuvAphorism(category, result);
      }
      return `凡${strippedElement(elements, "category", "如此行", [/^凡/u, /的$/u])}的，必${strippedElement(elements, "result", "得着相应的结果", [/^必/u])}。`;
    case "guarantee":
      return `我今日在众人面前作保：若${strippedElement(elements, "condition", "这事不照所说的成就", [/^若/u])}，我必${strippedElement(elements, "penalty", "担当它的罪责", [/^我必/u])}。`;
    case "trade_price":
      return `论到${strippedElement(elements, "item", "这物", [/^论到/u])}，每${strippedElement(elements, "unit", "一份", [/^每/u])}作价${strippedElement(elements, "price", "所定的银钱", [/^作价/u])}；你若交付，我便交在你手中。`;
    case "curse_penalty":
      return `若${strippedElement(elements, "condition", "事情果然不实", [/^若/u])}，${element(elements, "subject", "那物")}就有祸了；它必${strippedElement(elements, "penalty", "担当所定的刑罚", [/^(?:它)?必/u])}。`;
    case "agreement": {
      const action = strippedElement(elements, "action", "去行");
      if (/心.*(?:踏实|安稳)|踏实/u.test(action)) {
        return "有了你这句话，我的心就安稳了。";
      }
      if (/痛快|爽快|喜欢.*脾气/u.test(action)) {
        return "你既将话陈明，这在我眼中看为甚好；我所喜悦的，正是你口中这痛快的话。";
      }
      return `你所说的，我听见了；我必照这话${strippedElement(elements, "action", "去行", [/^我必照这话/u])}。`;
    }
    case "disagreement":
      return `这话在我眼中看为不美；论到${strippedElement(elements, "matter", "这事", [/^论到/u])}，我断不应允。`;
  }
}

const DELIVERY: Record<SpeechDelivery, string> = {
  said: "说",
  answered: "回答说",
  asked: "问说",
  warned: "劝戒说",
  commanded: "吩咐说",
  cried: "大声说",
};

function embeddedDelivery(
  delivery: SpeechDelivery,
  addressee: string,
) {
  if (delivery === "said") return addressee ? `对${addressee}说` : "说";
  if (delivery === "asked") return addressee ? `问${addressee}说` : "问说";
  if (delivery === "warned") return addressee ? `劝${addressee}说` : "劝戒说";
  if (delivery === "commanded") return addressee ? `吩咐${addressee}说` : "吩咐说";
  return DELIVERY[delivery];
}

function sameAddressee(a?: string, b?: string) {
  return cleanSlot(a, 50) === cleanSlot(b, 50);
}

function canMergeConsecutiveSpeech(
  previous: Extract<ScriptureSkeletonUnit, { kind: "speech" }>,
  current: Extract<ScriptureSkeletonUnit, { kind: "speech" }>,
) {
  return (
    previous.speaker === current.speaker &&
    sameAddressee(previous.addressee, current.addressee) &&
    (
      (["said", "answered"].includes(previous.delivery || "said") &&
        ["said", "answered"].includes(current.delivery || "said")) ||
      previous.delivery === current.delivery
    )
  );
}

function speechTag(
  unit: Extract<ScriptureSkeletonUnit, { kind: "speech" }>,
  previousSpeech: Extract<ScriptureSkeletonUnit, { kind: "speech" }> | null,
  seenCount: number,
  previousAddressee: string,
) {
  const speaker = cleanSlot(unit.speaker, 50);
  const addressee = cleanSlot(unit.addressee, 50);
  const delivery = unit.delivery || "said";

  if (previousSpeech?.speaker === speaker) {
    if (addressee && addressee !== cleanSlot(previousSpeech.addressee, 50)) {
      return `又对${addressee}说`;
    }
    if (delivery === "asked") return "又问说";
    if (delivery === "commanded") return "又吩咐说";
    if (delivery === "warned") return "又劝戒说";
    if (delivery === "cried") return "又大声说";
    return "又说";
  }
  if (delivery === "answered") {
    return previousSpeech &&
      (previousSpeech.delivery === "asked" || previousSpeech.speaker === addressee)
      ? `${speaker}回答说`
      : `${speaker}说`;
  }
  if (delivery === "asked") return `${speaker}${addressee ? `问${addressee}` : "问"}说`;
  if (delivery === "commanded") {
    return `${speaker}${addressee ? `吩咐${addressee}` : "吩咐"}说`;
  }
  if (delivery === "warned") return `${speaker}${addressee ? `劝${addressee}` : "劝戒"}说`;
  if (delivery === "cried") return `${speaker}大声说`;
  if (previousSpeech && addressee && previousSpeech.speaker === addressee) {
    return `${speaker}回答说`;
  }
  if (addressee && (seenCount === 0 || previousAddressee !== addressee)) {
    return `${speaker}对${addressee}说`;
  }
  return `${speaker}说`;
}

function redundantNarrativeResult(action: string, result: string) {
  if (!result) return true;
  if (action.includes(result) || result.includes(action)) return true;
  const pairs = [
    ["刺伤", "受伤"],
    ["制住", "被制住"],
    ["拦住", "被拦住"],
    ["打倒", "倒下"],
    ["杀死", "死了"],
    ["离开", "离去"],
  ] as const;
  return pairs.some(
    ([cause, consequence]) => {
      const causeAt = action.indexOf(cause);
      if (causeAt < 0 || !result.includes(consequence)) return false;
      const affected = action
        .slice(causeAt + cause.length)
        .replace(/^[了把将]/u, "")
        .split(/[，；、\s]/u)[0]
        .slice(0, 12);
      return !affected || result.includes(affected);
    },
  );
}

function renderNarration(
  unit: Extract<ScriptureSkeletonUnit, { kind: "narration" }>,
  previousFrame: NarrationFrameId | "" = "",
  previousActor = "",
  previousSpeechAddressee = "",
  previousSpeechSpeaker = "",
) {
  const actor = cleanSlot(unit.actor, 50);
  const target = cleanSlot(unit.target, 50);
  const object = cleanSlot(unit.object, 100);
  const suppliedAction = cleanSlot(unit.action, 180);
  let rawResult = cleanSlot(unit.result, 180);
  let rawAction = suppliedAction || rawResult || "行了所要行的事";
  if (!suppliedAction && rawResult) rawResult = "";
  if (/^扑(?:过去|上前)/u.test(rawAction) && previousSpeechAddressee) {
    rawAction = `向${previousSpeechAddressee}${rawAction}`;
  }
  if (/(?:刺伤|打伤|杀伤)$/u.test(rawAction) && previousActor && previousActor !== actor) {
    rawAction += previousActor;
  }
  if (/制住$/u.test(rawAction)) {
    const resultTarget = rawResult.match(/^([\p{Script=Han}A-Za-z·]{1,12})(不能|无法|不得)(.+)$/u);
    if (resultTarget) {
      rawAction += resultTarget[1];
      rawResult = `使他${resultTarget[2]}${resultTarget[3]}`;
    }
  }
  const action = /叫了一声$/u.test(rawAction)
    ? `叫了${target || object || "同伴"}的名字`
    : rawAction;
  const place = cleanSlot(unit.place, 80);
  const time = cleanSlot(unit.time, 80);
  const matter = cleanSlot(unit.matter, 180);
  const result = redundantNarrativeResult(action, rawResult) ? "" : rawResult;
  const fullAction = action || object || target || "行了所要行的事";

  switch (unit.frame) {
    case "arrival":
      return `${time ? `到了${time}，` : "那时，"}${actor || "有人"}${place ? `来到${place}` : "来到那里"}${result ? `；${result}` : ""}。`;
    case "setting":
      if (/里面|屋里/u.test(place)) {
        return `那屋里，${!matter || /已经预备妥当/u.test(matter) ? "筵席已经摆设齐备" : matter}。`;
      }
      if (/酒席前|席前/u.test(place)) return "众人在席前坐定。";
      return `${time ? `那时正是${time}，` : "那时，"}${place ? (/中$|里$|前$|上$/u.test(place) ? place : `${place}中`) : "众人中间"}${matter || "已经预备妥当"}。`;
    case "action":
      {
        const conditionalAction = /^(?:虽(?:然)?|既|因(?:为)?|仍|却|若|倘若|纵然|即便)/u.test(
          fullAction,
        );
        const timePrefix = time ? `到了${time}，` : "";
        const speechPrefix = actor && previousSpeechSpeaker === actor ? "说完这话，" : "";
        const actorPrefix = actor ? `${actor}${conditionalAction ? "" : "就"}` : "";
        return `${speechPrefix}${timePrefix}${actorPrefix}${fullAction}${result ? `${/^(?:使|好叫|以致)/u.test(result) ? "，" : "；"}${result}` : ""}。`;
      }
    case "reaction":
      return `${actor || "那人"}${previousSpeechSpeaker ? "听见这话" : "看见这事"}${target ? `，就转向${target}` : ""}，${action}${result ? `；${result}` : ""}。`;
    case "indirect_speech":
      return `${actor}${target ? `就向${target}` : "便向众人"}陈明${matter || "这事"}${result ? `，好叫人知道${result}` : ""}。`;
    case "introduction":
      return `${actor}${target ? `把${target}` : "把同来的人"}带到众人面前，说明${matter || "他们的名与关系"}。`;
    case "transition":
      return `及至${matter || "事情到了这一步"}，${actor}就${action}${result ? `；${result}` : ""}。`;
    case "outcome":
      if (previousFrame === "outcome") {
        return `${actor ? `${actor}${/^眼看/u.test(fullAction) ? "只能" : "就"}` : ""}${fullAction}${result ? `；${result}` : ""}。`;
      }
      return `于是${actor}${fullAction}${result ? `；${result}` : ""}。`;
  }
}

const OPENING_SPEECH_INTENTS = new Set<SpeechIntentId>([
  "welcome",
  "waited_arrival",
  "guide_inside",
  "invite_seat",
  "introduction",
  "courtesy_gift",
  "courtesy_refusal",
  "self_identification",
]);

function isOpeningUnit(unit: ScriptureSkeletonUnit) {
  if (unit.kind === "speech") return OPENING_SPEECH_INTENTS.has(unit.intent);
  if (unit.kind === "declaration") return false;
  if (["arrival", "setting", "introduction"].includes(unit.frame)) return true;
  const details = [unit.action, unit.object, unit.matter, unit.place]
    .filter(Boolean)
    .join("，");
  return (
    ["action", "reaction", "indirect_speech"].includes(unit.frame) &&
    /迎接|引导|领.*进去|往里面|坐席|落座|叫.*名字|礼物|所带|带来之物|摆在席前/u.test(details)
  );
}

function primaryName(value: string) {
  return cleanSlot(value, 50)
    .split(/[、，,]|(?:和|与)/u)[0]
    .replace(/等人$/u, "") || "那人";
}

function normalizeCondensedRelation(value: string, owner: "self" | "host") {
  const relation = cleanSlot(value, 80)
    .replace(/^(?:乃是|就是|是)/u, "")
    .trim();
  const possessive = owner === "self" ? "自己的" : "他的";
  if (!relation) return `${possessive}兄弟`;
  if (/^(?:兄弟|朋友|同伴|伙伴|门徒|亲属)$/u.test(relation)) {
    return `${possessive}${relation}`;
  }
  if (owner === "self") return relation.replace(/^我的/u, "自己的");
  return relation.replace(/^我的/u, "他的");
}

function condenseHistoricalOpening(plan: ScriptureSkeletonPlan) {
  if (!/故事|记事|片段|冲突/u.test(cleanSlot(plan.textType, 60))) return plan;
  let openingEnd = 0;
  while (openingEnd < plan.units.length && isOpeningUnit(plan.units[openingEnd])) {
    openingEnd += 1;
  }
  if (openingEnd < 5 || openingEnd >= plan.units.length) return plan;

  const opening = plan.units.slice(0, openingEnd);
  const arrival = opening.find(
    (unit): unit is Extract<ScriptureSkeletonUnit, { kind: "narration" }> =>
      unit.kind === "narration" && unit.frame === "arrival",
  );
  if (!arrival) return plan;

  const guest = primaryName(arrival.actor || "");
  const speakerCounts = new Map<string, number>();
  for (const unit of opening) {
    if (unit.kind !== "speech" || unit.speaker === guest) continue;
    speakerCounts.set(unit.speaker, (speakerCounts.get(unit.speaker) || 0) + 1);
  }
  const host = [...speakerCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "";
  if (!host) return plan;

  const introductions = opening.filter(
    (unit): unit is Extract<ScriptureSkeletonUnit, { kind: "speech" }> =>
      unit.kind === "speech" && unit.intent === "introduction",
  );
  const guestIntroduction = introductions.find((unit) => unit.speaker !== host);
  const hostIntroduction = introductions.find((unit) => unit.speaker === host);
  const companionNames = guestIntroduction
    ? strippedElement(guestIntroduction.elements, "names", "同行的人")
    : "";
  const companionRelation = guestIntroduction
    ? normalizeCondensedRelation(
        strippedElement(guestIntroduction.elements, "relation", "自己的同伴"),
        "self",
      )
    : "";
  const hostRelation = hostIntroduction
    ? normalizeCondensedRelation(
        strippedElement(hostIntroduction.elements, "relation", "他的兄弟"),
        "host",
      )
    : "";
  const hostRelationName = hostIntroduction
    ? strippedElement(hostIntroduction.elements, "names", "那人")
    : "";
  const gift = opening.find(
    (unit): unit is Extract<ScriptureSkeletonUnit, { kind: "narration" }> =>
      unit.kind === "narration" &&
      /礼物|所带|带来之物|带来的东西/u.test(
        [unit.action, unit.object, unit.matter].filter(Boolean).join("，"),
      ),
  );

  const condensed: ScriptureSkeletonUnit[] = [arrival];
  condensed.push({
    kind: "narration",
    frame: "action",
    actor: host,
    action: `迎接${guest}${companionNames ? "和同行的人" : ""}，与他们一同坐席`,
  });

  const details: string[] = [];
  if (guestIntroduction) {
    details.push(
      `${guestIntroduction.speaker}将${companionNames}引到众人面前，称他们为${companionRelation}`,
    );
  }
  if (gift) {
    const giftActor = cleanSlot(gift.actor, 50) || companionNames || "同行的人";
    details.push(`${giftActor}把所带之物陈在席前；${host}看见，便以弟兄之礼相待`);
  }
  if (hostIntroduction) {
    details.push(`${host}又使${guest}认识${hostRelationName}，就是${hostRelation}`);
  }
  if (details.length) {
    condensed.push({
      kind: "narration",
      frame: "action",
      action: details.join("。"),
    });
  }

  return {
    ...plan,
    units: [...condensed, ...plan.units.slice(openingEnd)],
  };
}

function repairHistoricalPlan(plan: ScriptureSkeletonPlan) {
  if (!/故事|记事|片段|冲突/u.test(cleanSlot(plan.textType, 60))) return plan;
  const units = [...plan.units];
  const mediationIndex = units.findIndex(
    (unit) => unit.kind === "speech" && unit.intent === "mediation_request",
  );
  const mediation = mediationIndex >= 0 ? units[mediationIndex] : null;

  if (
    mediation?.kind === "speech" &&
    !units.some((unit) => unit.kind === "speech" && unit.intent === "infer_motive")
  ) {
    const directnessIndex = units.findIndex(
      (unit, index) =>
        index < mediationIndex &&
        unit.kind === "speech" &&
        unit.intent === "request_directness" &&
        unit.addressee === mediation.speaker,
    );
    if (directnessIndex >= 0) {
      const directness = units[directnessIndex];
      if (directness.kind === "speech") {
        units[directnessIndex] = {
          ...directness,
          intent: "infer_motive",
          elements: { surface: "坐席吃喝", matter: "别的事" },
        };
      }
    }
  }

  const beneficiary =
    mediation?.kind === "speech"
      ? strippedElement(mediation.elements, "beneficiary", "") ||
        strippedElement(mediation.elements, "target", "")
      : "";
  if (beneficiary) {
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      if (unit.kind !== "speech" || unit.intent !== "self_defense") continue;
      const matter = cleanSlot(unit.elements.matter, 100);
      if (/^(?:向人)?借(?:钱|款)|^借用(?:钱|款)$/u.test(matter)) {
        units[index] = {
          ...unit,
          elements: { ...unit.elements, matter: `向${beneficiary}借钱` },
        };
      }
    }
  }

  return { ...plan, units };
}

function dedupeHistoricalSpeech(plan: ScriptureSkeletonPlan) {
  if (!/故事|记事|片段|冲突/u.test(cleanSlot(plan.textType, 60))) return plan;
  const units: ScriptureSkeletonUnit[] = [];
  for (const unit of plan.units) {
    const previous = units.at(-1);
    if (
      unit.kind === "speech" &&
      unit.intent === "request_directness" &&
      previous?.kind === "speech" &&
      previous.speaker === unit.speaker &&
      previous.intent === "infer_motive"
    ) {
      continue;
    }
    units.push(unit);
  }
  return { ...plan, units };
}

function isStandaloneAphorismPlan(plan: ScriptureSkeletonPlan) {
  const textType = cleanSlot(plan.textType, 60);
  if (/通知|公告|晓谕|条例|规则|清单|操作|技术|说明/u.test(textType)) return false;
  if (/观点|格言|警句|箴言|感悟|独白|寓言/u.test(textType)) return true;
  return (
    plan.units.length > 0 &&
    plan.units.length <= 4 &&
    plan.units.every(
      (unit) =>
        unit.kind === "declaration" &&
        ["general_rule", "contrast", "question"].includes(unit.intent),
    )
  );
}

function isAphorismFriendlyPlan(plan: ScriptureSkeletonPlan) {
  if (isStandaloneAphorismPlan(plan)) return true;
  return /故事|记事|片段|寓言|轶事/u.test(cleanSlot(plan.textType, 60));
}

function renderPlanClosure(plan: ScriptureSkeletonPlan) {
  if (isStandaloneAphorismPlan(plan)) return "";
  const hasConflict = plan.units.some((unit) => {
    if (unit.kind === "speech") {
      return ["insult_challenge", "exit_threat", "coercion", "death_threat"].includes(
        unit.intent,
      );
    }
    if (unit.kind === "declaration") return false;
    return /扑|刺伤|捅|刀|鲜血|制住|不能上前|受伤|倒下/u.test(
      [unit.action, unit.object, unit.result, unit.matter].filter(Boolean).join("，"),
    );
  });
  if (/冲突|故事|片段/u.test(cleanSlot(plan.textType, 60)) || hasConflict) return "";
  const last = plan.units.at(-1);
  if (!last) return "";
  const textType = cleanSlot(plan.textType, 60);

  // A developed narrative already has its own ending in the final event. A stock
  // colophon makes an ordinary short story sound mechanically generated. Keep
  // factual closures for compact, result-only records such as a technical fix or
  // a single departure event.
  if (plan.units.length > 2 && /记事|寓言|轶事/u.test(textType)) return "";

  if (/通知|公告|晓谕/u.test(textType)) return "所要晓谕的，就是这些。";
  if (/条例|规则|清单/u.test(textType)) return "所列的条例，就是这些。";

  if (last.kind === "narration") {
    const ending = [last.action, last.result, last.matter]
      .map((value) => cleanSlot(value, 180))
      .filter(Boolean)
      .join("；");
    if (/恢复|完成|完毕|办妥|成交|成功|成就|造齐|修好/u.test(ending)) {
      return "这事就这样成了。";
    }
    if (/离开|离去|回到|回去|带走|走了|受伤|倒下|捂住|制住|鲜血/u.test(ending)) {
      return "这事的结局，就是这样。";
    }
    return "所记的事，就是这些。";
  }

  const intent = last.intent;
  if (["command", "warning_pride", "general_rule", "rebuke"].includes(intent)) {
    return "所吩咐的话，就是这些。";
  }
  if (["promise", "guarantee", "agreement"].includes(intent)) {
    return "所立的话，就是这些。";
  }
  return "";
}

export function renderScriptureSkeletonPlan(plan: ScriptureSkeletonPlan) {
  plan = dedupeHistoricalSpeech(condenseHistoricalOpening(repairHistoricalPlan(plan)));
  const renderedUnits: string[] = [];
  const speakerSeen = new Map<string, number>();
  const intentSeen = new Map<string, number>();
  const lastAddressee = new Map<string, string>();
  let previousUnit: ScriptureSkeletonUnit | null = null;
  const aphorismMode = isAphorismFriendlyPlan(plan);
  const storyAnchorMode =
    !isStandaloneAphorismPlan(plan) &&
    /故事|记事|片段|寓言|轶事/u.test(cleanSlot(plan.textType, 60));

  for (const unit of plan.units) {
    if (unit.kind === "narration") {
      renderedUnits.push(
        renderNarration(
          unit,
          previousUnit?.kind === "narration" ? previousUnit.frame : "",
          previousUnit?.kind === "narration" ? cleanSlot(previousUnit.actor, 50) : "",
          previousUnit?.kind === "speech" ? cleanSlot(previousUnit.addressee, 50) : "",
          previousUnit?.kind === "speech" ? cleanSlot(previousUnit.speaker, 50) : "",
        ),
      );
    } else if (unit.kind === "declaration") {
      renderedUnits.push(
        renderSpeech(unit.intent, unit.elements, { aphorismMode, storyAnchorMode }),
      );
    } else {
      const addressee = cleanSlot(unit.addressee, 50);
      const intentKey = `${unit.speaker}:${unit.intent}`;
      const body = renderSpeech(unit.intent, unit.elements, {
        speaker: unit.speaker,
        addressee,
        occurrence: intentSeen.get(intentKey) || 0,
        aphorismMode,
        storyAnchorMode,
      });
      const previousSpeech = previousUnit?.kind === "speech" ? previousUnit : null;

      if (
        previousSpeech &&
        canMergeConsecutiveSpeech(previousSpeech, unit) &&
        renderedUnits.length
      ) {
        renderedUnits[renderedUnits.length - 1] = renderedUnits[renderedUnits.length - 1].replace(
          /”$/u,
          `${body}”`,
        );
      } else if (
        previousUnit?.kind === "narration" &&
        cleanSlot(previousUnit.actor, 50) === unit.speaker &&
        ["action", "reaction", "transition"].includes(previousUnit.frame) &&
        renderedUnits.length
      ) {
        const delivery = embeddedDelivery(unit.delivery || "said", addressee);
        renderedUnits[renderedUnits.length - 1] = renderedUnits[renderedUnits.length - 1].replace(
          /。$/u,
          `，${delivery}：“${body}”`,
        );
      } else {
        const tag = speechTag(
          unit,
          previousSpeech,
          speakerSeen.get(unit.speaker) || 0,
          lastAddressee.get(unit.speaker) || "",
        );
        renderedUnits.push(`${tag}：“${body}”`);
      }

      speakerSeen.set(unit.speaker, (speakerSeen.get(unit.speaker) || 0) + 1);
      intentSeen.set(intentKey, (intentSeen.get(intentKey) || 0) + 1);
      if (addressee) lastAddressee.set(unit.speaker, addressee);
    }
    previousUnit = unit;
  }

  const closure = renderPlanClosure(plan);
  if (closure && !renderedUnits.at(-1)?.endsWith(closure)) renderedUnits.push(closure);

  const paragraphs: string[] = [];
  let current = "";
  for (const rendered of renderedUnits.filter(Boolean)) {
    if (current.length + rendered.length > 360 && current) {
      paragraphs.push(current);
      current = rendered;
    } else current += rendered;
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n").trim();
}

export function buildSkeletonIdentificationPrompt(source: string) {
  const sourceLength = [...source.trim()].length;
  const shortStoryRule =
    sourceLength >= 100 && sourceLength <= 200
      ? `\n18. 本次输入为 ${sourceLength} 字。若它是有人物与事件推进的短故事，必须安排至少两处“名句载体”：优先为一至两个 declaration:general_rule，再配合一个最关键的 speech；没有对白时使用两个 declaration。每个 declaration 都必须从原文已有的时辰、劳苦与果效、选择与后果、言语与反应、帮助、诚实、忍耐、骄傲、道路、撒种收取或树与果子关系中提取 category 与 result，好让服务器套入高保留的著名和合本句式。可补入一至两个不改变因果的微小动作或场面过渡，使故事完整，但不得增加新人物、新动机、新冲突或新结局。开场从简，名句与铺陈集中在转折和结果。`
      : "";
  return `把输入整理成一篇“圣经小故事”的情节骨架，不写正文，也不要选择圣经句子。服务器会按照对白功能决定固定骨架，再机械填入元素。

这不是逐句翻译或影视台词校对。最高目标是让后续渲染成为一篇连贯、庄严、可一口气读完的圣经式记事。只锁定人物与阵营、核心冲突、决定局势的发言、关键因果、关键动作归属、伤害对象和结局。寒暄、礼让、重复称呼、坐席饮酒和相近对白可以合并、压缩、调序或改成叙述。

${buildCuvStoryTemplatePrompt(source)}

只输出以下 JSON：
{
  "textType": "记事/通知/观点/独白/条例等",
  "units": [
    {"kind":"narration","frame":"arrival/action/reaction/indirect_speech/introduction/transition/outcome/setting","actor":"","target":"","action":"不含主语的完整动作短语","object":"","place":"","time":"","matter":"","result":""},
    {"kind":"speech","intent":"对白功能","speaker":"","addressee":"","delivery":"said/answered/asked/warned/commanded/cried","elements":{"元素名":"来自输入的短语"}},
    {"kind":"declaration","intent":"对白功能","elements":{"元素名":"来自输入的短语"}}
  ]
}

可用对白功能及应填元素：
- welcome, waited_arrival, guide_inside(place), invite_seat, introduction(count,names,relation)
- courtesy_gift(gift), courtesy_refusal(relation), self_identification(name)
- reputation(qualities), offer_help(matter), reassurance(basis), approval(quality)
- infer_motive(surface,matter), request_directness(matter)
- conditional_commitment(action,allowance), mediation_request(beneficiary,action,result)
- mutual_claim(theirs,mine), self_defense(matter,rejected,asserted), status_observation(supporters)
- insult_challenge(knownA,knownB,challenge), rebuke(action,prohibition)
- paired_dominance(categoryA,resultA,categoryB,resultB), face_boundary(theirAction,myAction)
- relay_request(target,matter), warning_pride(warning), youth_defiance(person,quality)
- exit_threat(condition,consequence), method_challenge(action)
- coercion(positiveCondition,negativeCondition,result), boast(action), death_threat(target)
- request(action,result), refusal(matter,action), command(action,prohibition), promise(action)
- question(question,more), contrast(rejected,asserted), general_rule(category,result)
- guarantee(condition,penalty), trade_price(item,unit,price), curse_penalty(condition,subject,penalty)
- agreement(action), disagreement(matter)

硬规则：
1. 必须保留人物、阵营、核心交易或借贷方向、决定冲突的条件、动作执行者、承受者、伤害对象和结局。次要数字、寒暄次序、礼让轮次和场面小动作不必逐项复刻；可按“到场—坐席—提出请求—双方争辩—冲突升级—结局”重新编排。
2. 不准输出 frame 形式的对白骨架编号，不准写圣经体正文，不准把“若、必、不可、乃是”等风格词填进 elements。
3. 不要给原文每一句对白都建立 speech。全篇通常整理为 12—36 个 unit；连续寒暄最多保留一个 welcome 或 guide_inside，落座最多一个 invite_seat，重复客气最多保留 courtesy_gift 与 courtesy_refusal 各一个。只有改变局势的请求、拒绝、辩护、警告、威胁、强迫和关键反问必须保留为 speech；其余内容合并成 narration 或删去重复。
4. elements 只填骨架尚未包含的名词或谓语核心，绝不填整句或半句原台词，也不重复骨架虚词。例如 offer_help.matter 只填“什么事”，不可填“以后若有什么事情，你只管开口”；exit_threat.condition 只填“这样离开房间”，不可填“你今日若这样走出房子”；boast.action 只填“这样对我说话”，不可填“我长到这么大还没有人敢这样说话”。
5. introduction.count 只填“一、两、三”等数词，不填“个、人、个人”；names 只填姓名；relation 只填“我的兄弟、同伴、同事”等关系。死亡威胁的 target 只填被威胁者，不填“你的命”或“弄死”。
6. narration.action 填不含主语、但包含对象和去向的完整动作短语，例如“从手中取出文件，摆在负责人面前”；不得只填“叫了一声”，必须填“叫目标人物的名字”。
7. 同一动作只建立一个 unit；result 只填动作之外的新后果，不得把“甲刺伤乙”再配上“乙受伤”，也不得把“甲制住乙”再配上“乙被制住”。
8. 找不到精确功能时，选择最接近的 request/refusal/command/promise/question/contrast/general_rule/agreement/disagreement；“心里踏实”使用 reassurance，“痛快、喜欢这种脾气”使用 approval，不得使用 agreement。
9. delivery=answered 只用于直接回答上一人的问题或主张；普通接续使用 said，质问使用 asked，威胁喊叫使用 cried。龙虎等两个并列类别必须使用 paired_dominance，不得塞入 general_rule。
10. 凡“扑、刺伤、制住、交给、带走、叫名字”等及物动作，action 必须包含承受者；例如“用工具损伤乙”，不可只填“用工具损伤”。mediation_request.result 只能填真实目的，不得只填受益人的姓名。
11. mediation_request 专用于“甲请求乙为了丙而停止、允许或改变某事”，speaker 必须是甲，addressee 必须是乙，beneficiary 必须是丙；relay_request 只用于“甲叫乙传话给丙，让丙亲自来找甲”。二者不可混用。借钱关系必须明确谁向谁借、是否承诺归还。
12. 单独呼喊一个人的名字只是叫住、示意或使其停步，不是 welcome；应写成 action/reaction，或与紧接着的 warning、command 合并。不得因一句称呼让人物重新邀请对方坐席。
13. 每一个保留的 speech 都只填一个清楚的发言功能；可以改变表面说法以适配固定圣经骨架，但不得把劝诫交给辩护者、把拒绝者写成应允者、把威胁者和被威胁者调换。
14. 输入若是没有人物对白的观点、感悟、座右铭或警句，textType 必须写“格言”或“观点”。一句话或一个短段通常只整理成一个 declaration，信息确有两层时最多两个；不可把一句话拆成多条解释。优先使用 general_rule(category,result) 或 contrast(rejected,asserted)，不得虚构说话人。category 只填最核心的行为、品格或处境，result 只填最核心的后果，不得把“凡、必、有福、乃是”等骨架词塞入元素。
15. 格言必须保持原文的褒贬和因果方向：值得鼓励的行为配正面结果，应当禁止的行为配负面后果；不得把“不离开朋友、诚实、忍耐”等善行整理成应当禁止之事，也不得把“贪图捷径、欺骗、骄傲”等恶行整理成应当持守之事。category 与 result 都要写成独立、明确、没有双重否定的短语。格言最终应像一节真实经文：短促、完整、通常只有一至两个分句；只靠拢一个最合适的著名句式，不得把几处经文拼成解释段落。
16. 长篇故事也可以使用格言骨架。遇到明确的因果、报应、骄傲、忍耐、取舍、量人、撒种收取、树与果子、光暗、道路、根基、时候、言语、怒气或朋友关系时，可以把相邻情节合并为 declaration:general_rule，使正文出现一至四处格言式判断；也可以把关键对白的意思靠拢到合适格言。为了节目效果可以增强比喻和复沓，但不得调换人物阵营、动作归属、伤害对象或因果方向。
17. 只输出 JSON，不输出 Markdown。
${shortStoryRule}

<输入>
${source}
</输入>`;
}

export function renderEmergencyScripture(source: string) {
  const cleaned = cleanSlot(source, 3000);
  return `论到这事，所记的乃是这样：${cleaned}。凡听见这话的，都当察看其中的缘故。`;
}
