export type ScriptureSourceGenre =
  | "story"
  | "aphorism"
  | "definition"
  | "notice"
  | "instruction"
  | "factual";

const DIRECT_SPEECH = /[“"‘'][^”"’']{2,}[”"’']/u;
const STORY_SIGNAL =
  /(?:来到|进屋|看见|听见|回答|问道|说道|说完|寒暄|随后|于是|后来|转身|离开|扑向|受伤|带着|起了冲突|发生冲突).{0,36}(?:他|她|他们|众人|那人|另一个人|冲突|离去|离开)|[“"‘'][^”"’']{2,}[”"’']/u;
const STRONG_DEFINITION_SIGNAL =
  /(?:是|指的是|是指|称为|叫作|定义为).{0,180}(?:以.{1,60}为|由.{1,80}(?:组成|构成)|包括|属于|用于|作为|标准|规范|基础|统称|总称)/u;
const NOTICE_SIGNAL = /^(?:通知|公告|提醒|安排|须知|告示|各位|请于|兹定于)[：:，,s]|(?:会议|活动|课程).{0,30}(?:定于|改到|安排在)/u;
const INSTRUCTION_SIGNAL =
  /^(?:步骤|操作|用法|规则|条例|要求|说明)[：:，,s]|(?:请|必须|需要|应当|务必).{0,30}(?:点击|填写|提交|安装|重启|检查|上传|下载|保存|完成)/u;
const APHORISM_SIGNAL =
  /(?:凡|宁可|不可|不要|莫要|应当|总要|惟有|有福|有祸|虽.{0,18}仍|若.{0,28}(?:必|就|便)|只有.{0,28}才|真正的|至终|终必|早晚|自食其果|种的是什么|收的也是什么|跌倒.{0,12}兴起)/u;
const BEHAVIOR_RESULT_SIGNAL =
  /(?:坚持|努力|勤劳|懒惰|诚实|欺骗|骄傲|谦卑|忍耐|饶恕|帮助|善待|恶待|拖延|放弃|学习|思考|说话|待人|走捷径).{0,32}(?:成功|失败|收获|果效|回报|后果|进步|跌倒|兴起|失去|得到|得着|看见|显明)/u;

function normalizedSource(source: string) {
  return source.trim().replace(/[。！？!?；;s]+$/gu, "");
}

export function isStrongDefinitionSource(source: string) {
  const value = normalizedSource(source);
  return !DIRECT_SPEECH.test(value) && STRONG_DEFINITION_SIGNAL.test(value);
}

export function isAphorismSource(source: string) {
  const value = normalizedSource(source);
  if (!value || DIRECT_SPEECH.test(value) || isStrongDefinitionSource(value)) return false;
  if (NOTICE_SIGNAL.test(value) || INSTRUCTION_SIGNAL.test(value)) return false;
  return APHORISM_SIGNAL.test(value) || BEHAVIOR_RESULT_SIGNAL.test(value);
}

export function classifyScriptureSource(source: string): ScriptureSourceGenre {
  const value = normalizedSource(source);
  if (STORY_SIGNAL.test(value)) return "story";
  if (isStrongDefinitionSource(value)) return "definition";
  if (NOTICE_SIGNAL.test(value)) return "notice";
  if (INSTRUCTION_SIGNAL.test(value)) return "instruction";
  if (isAphorismSource(value)) return "aphorism";
  return "factual";
}

function sentenceEnding(value: string) {
  return /[。！？!?]$/u.test(value) ? value : `${value}。`;
}

function formatDefinitionFeatures(value: string) {
  const parts = value
    .split(/[，,]/u)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return value;
  return parts
    .map((part, index) => {
      if (index === 0 || index !== parts.length - 1 || !/^以/u.test(part)) return part;
      return `又${part}`;
    })
    .join("；");
}

/**
 * Strong definitions are rendered deterministically so a neutral statement can
 * never be turned into a blessing, curse, command, or invented consequence.
 */
export function renderDefinitionSource(source: string) {
  const value = normalizedSource(source);
  if (!isStrongDefinitionSource(value)) return "";

  const match = value.match(/^(.{1,80}?)(?:是指|指的是|定义为|称为|叫作|是)(.+)$/u);
  if (!match) return "";
  const subject = match[1].trim();
  const remainder = match[2].trim();
  if (!subject || !remainder) return "";

  const namedDefinition = remainder.match(/^(.{4,500})的([\p{Script=Han}A-Za-z0-9·（）()_-]{1,24})$/u);
  if (namedDefinition && /(?:以.{1,60}为|由.{1,80}(?:组成|构成)|包括)/u.test(namedDefinition[1])) {
    const features = formatDefinitionFeatures(namedDefinition[1].trim());
    return sentenceEnding(
      `论到${subject}，所称为${namedDefinition[2]}的，乃是这样：它${features}`,
    );
  }

  return sentenceEnding(`论到${subject}，${subject}乃是${formatDefinitionFeatures(remainder)}`);
}

export function renderSafeFactualSource(source: string) {
  const value = normalizedSource(source);
  const genre = classifyScriptureSource(source);
  if (genre === "definition") return renderDefinitionSource(source);
  if (genre === "notice") return sentenceEnding(`论到这通知，所定的乃是这样：${value}`);
  if (genre === "instruction") return sentenceEnding(`论到这事，所吩咐的乃是这样：${value}`);
  return sentenceEnding(`论到这事，所记的乃是这样：${value}`);
}

export function hasForbiddenMoralization(source: string, output: string) {
  const genre = classifyScriptureSource(source);
  if (genre === "story" || genre === "aphorism") return false;
  const introduced = /有福|有祸|咒诅|刑罚|审判|夺取.{0,12}的命/u.test(output);
  const supported = /有福|有祸|咒诅|刑罚|审判|杀|夺取.{0,12}的命/u.test(source);
  if (introduced && !supported) return true;
  if (
    (genre === "definition" || genre === "factual") &&
    /凡.{1,80}必/u.test(output) &&
    !/(?:凡|必然|总是|都会|无不)/u.test(source)
  ) {
    return true;
  }
  return false;
}

export function definitionTermsArePreserved(source: string, output: string) {
  if (!isStrongDefinitionSource(source)) return true;
  const rendered = renderDefinitionSource(source);
  if (!rendered) return true;
  const terms = [...rendered.matchAll(/(?:论到|所称为)([\p{Script=Han}A-Za-z0-9·（）()_-]{2,30})/gu)]
    .map((match) => match[1])
    .filter(Boolean);
  return terms.every((term) => output.includes(term));
}
