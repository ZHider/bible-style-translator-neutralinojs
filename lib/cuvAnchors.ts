export type CuvAnchor = {
  id: string;
  sourceShape: string;
  fillableFrame: string;
  useWhen: string;
  triggers: RegExp;
  outputPattern?: RegExp;
  constraints?: string;
};

const CUV_CORE_ANCHORS: readonly CuvAnchor[] = [
  {
    id: "command-result",
    sourceShape: "“神说：‘要有光’，就有了光。”／“事就这样成了。”式",
    fillableFrame:
      "【人物】说／吩咐：‘要有【输入已经实现的事物或结果】。’【事物或结果】就有了；这事就这样成了。",
    useWhen: "命令、决定、执行和完成",
    triggers:
      /(?:说|命令|吩咐|要求|叫|让).{0,48}(?:执行完|完成|做好|办成|照做|落实|已经|成功|交付|修好)|(?:执行完|完成|做好|办成|照做|落实|已经|成功|交付|修好).{0,48}(?:说|命令|吩咐|要求|叫|让)/u,
  },
  {
    id: "request-favor",
    sourceShape: "“我若在你眼前蒙恩，求你……”式",
    fillableFrame:
      "【请求者】对【被请求者】说：‘我若在你眼前蒙恩，求你【输入已有的动作】，好叫【输入已有的目的】得以成就。’",
    useWhen: "请求、借用、申请、许可和求助",
    triggers: /请|求|希望|借|申请|允许|帮|麻烦|拜托/u,
    outputPattern: /我若在.{0,16}眼前蒙恩.{0,36}(?:求|请)/u,
    constraints: "请求者、被请求者和请求方向必须与输入一致；不可把劝阻改成传话，也不可把被保护者改成发令者。",
  },
  {
    id: "unworthiness-question",
    sourceShape: "“我是什么人，竟能……呢？”式",
    fillableFrame:
      "【人物】说：‘我是什么样的人，竟能【输入已有的困难动作或资格】呢？’",
    useWhen: "自疑、推辞、惊讶或质问资格",
    triggers: /不敢|不能|凭什么|资格|怎么可能|我能|做不到|配不上/u,
  },
  {
    id: "known-who-question",
    sourceShape: "“耶稣我认识，保罗我也知道。你们却是谁呢？”式",
    fillableFrame:
      "【输入中确有名望的人物】我认识，【他的名声、所行的事或另一已知人物】我也知道；论到你，你却是谁，竟敢【输入已有的冒犯或挑战】呢？",
    useWhen: "身份羞辱、插话、挑衅、质问资格和名声对比",
    triggers: /你算什么|算什么东西|你是谁|什么人|竟敢|凭什么|资格|有头有脸|名声/u,
    outputPattern: /我(?:认识|知道).{1,30}我也(?:认识|知道).{1,30}你却是谁/u,
    constraints: "前两项必须是说话人确实认识的人物或名声，最后一项才是被挑战者；禁止写成“你我认识”“我哥我也知道”。",
  },
  {
    id: "brother-keeper",
    sourceShape: "“我岂是看守我兄弟的吗？”式",
    fillableFrame:
      "【人物】说：‘我岂是看守【输入中被推来的责任对象】的吗？【输入已有的责任归属】。’",
    useWhen: "推卸责任、拒绝代管、划清职责和反问归属",
    triggers: /关我什么事|不关我的事|归我管|不归我管|负责|看管|照看|照顾/u,
    outputPattern: /我岂是.{0,24}(?:看守|看管|照管|负责).{0,16}的吗/u,
  },
  {
    id: "name-declaration",
    sourceShape: "“我的名叫……”／“人要称他的名为……”式",
    fillableFrame:
      "【人物】说：‘论到我的名，人所称呼我的名乃是【输入中的姓名】。’",
    useWhen: "自报姓名、介绍人物、询问姓名和报上名号",
    triggers: /名叫|姓名|叫什么|报上姓名|报上名号|自我介绍|介绍.{0,12}(?:自己|姓名)/u,
    outputPattern: /论到我的名.{0,20}(?:人所称呼我的名|人称我).{0,8}(?:乃是|为)/u,
  },
  {
    id: "you-me-confrontation",
    sourceShape: "“你来攻击我，是靠着刀枪和铜戟；我来攻击你，是靠着万军之耶和华的名。”式",
    fillableFrame:
      "你凭着【对方已有的手段／身份】到我这里来；我却凭着【说话人已有的手段／立场】到你面前。",
    useWhen: "冲突、挑衅、对峙和立场压制",
    triggers:
      /你(?:凭着|拿着|带着|用).{1,40}(?:我|他).{0,4}(?:凭着|拿着|带着|用)/u,
  },
  {
    id: "identity-consequence",
    sourceShape: "“耶和华是我的牧者，我必不至缺乏。”式",
    fillableFrame:
      "【输入中的主体】是【人物】的【真实关系／用途】；【人物】便不至【输入已有的负面结果】。",
    useWhen: "身份、依靠、工具用途和保障关系",
    triggers: /是我的|依靠|负责|保护|支持|帮助|工具|靠|保证|保障/u,
  },
  {
    id: "you-have-i-have",
    sourceShape: "“你有……我有……”式",
    fillableFrame:
      "你有【输入中属于对方的人／关系／责任】；我也有【输入中属于说话人的人／关系／责任】。你为你的【对象】说话，我也为我的【对象】行事。",
    useWhen: "双方各有自己的人、立场、责任或资源",
    triggers:
      /有.{0,16}(?:兄弟|朋友|同伴|手下|责任|立场).{0,40}有.{0,16}(?:兄弟|朋友|同伴|手下|责任|立场)/u,
    outputPattern:
      /(?:你|[^，。；]{1,12})有.{1,24}[；，](?:我|[^，。；]{1,12})(?:也)?有/u,
  },
  {
    id: "soft-hard-consequence",
    sourceShape: "“回答柔和，使怒消退；言语暴戾，触动怒气”式",
    fillableFrame:
      "【第一种言语／动作】，使【结果一】；【第二种言语／动作】，却使【结果二】。",
    useWhen: "两种做法、两种态度或相反结果",
    triggers: /反而|相反|一边.{0,24}另一边|温和.{0,24}(?:生气|愤怒)/u,
  },
  {
    id: "heart-mouth",
    sourceShape: "“因为心里所充满的，口里就说出来”式",
    fillableFrame:
      "因为【人物】心里所充满的，口里就说出来；他便以【输入已有的话语性质】待【对象】。",
    useWhen: "怒骂、讥讽、脱口而出和言语显明态度",
    triggers: /骂|辱骂|怒斥|喝骂|脱口|说出|口出/u,
    outputPattern: /心里所充满的.{0,12}口里就说出来/u,
  },
  {
    id: "vanity-repetition",
    sourceShape: "“虚空的虚空……凡事都是……”式",
    fillableFrame:
      "【输入中的判断】的【同义复沓】；凡【输入限定的同类事情】，都是【同一判断】。",
    useWhen: "吐槽重复、徒劳、循环和总体判断",
    triggers: /没用|白费|徒劳|重复|循环|总是|全都|无聊/u,
  },
  {
    id: "appointed-time",
    sourceShape: "“凡事都有定期，天下万务都有定时”式",
    fillableFrame:
      "【事项一】有【输入已有的时间】；【事项二】也有【输入已有的时间／期限】。",
    useWhen: "日程、期限、阶段、等待和先后安排",
    triggers: /时间|日期|今天|明天|上午|下午|晚上|时辰|点钟|期限|到期|随后|后来/u,
  },
  {
    id: "young-not-despised",
    sourceShape: "“不可叫人小看你年轻”式",
    fillableFrame:
      "不可叫人小看【人物】年轻；【人物】若不【输入已有的年轻人特征】，岂不【输入已有的反问结论】吗？",
    useWhen: "年轻、资历、气盛、后生和以年龄压人",
    triggers: /年轻|年纪|少年|后生|气盛|资历|开裆裤/u,
    outputPattern: /不可叫人小看.{0,16}年轻/u,
    constraints: "只交给维护年轻、资历或胆气的一方；不可交给劝人收敛气盛的一方。结尾只能保留一个疑问语气词。",
  },
  {
    id: "tomorrow-worry",
    sourceShape: "“不要为明日忧虑，因为明日自有明日的忧虑”式",
    fillableFrame:
      "不要为【输入已有的将来事项】忧虑，因为【将来事项】自有【将来的处置】；【眼前事项】当在今日办理。",
    useWhen: "担忧将来、延期、今日与明日的安排",
    triggers: /担心|忧虑|明天|将来|以后再说|以后处理/u,
    outputPattern: /不要为.{0,24}忧虑.{0,12}自有/u,
  },
  {
    id: "blessed-because",
    sourceShape: "“……的人有福了，因为……”式",
    fillableFrame:
      "那【输入已有行为】的人是有福的，因为他必【输入已有的正面结果】。",
    useWhen: "赞许某种行为，并且输入明确给出好结果",
    triggers: /有福|福气|幸运|幸好/u,
  },
  {
    id: "ask-seek-parallel",
    sourceShape: "“祈求，就给；寻找，就寻见；叩门，就开门”式",
    fillableFrame:
      "【动作一】，就【结果一】；【动作二】，就【结果二】；【动作三】，也必【结果三】。",
    useWhen: "步骤、尝试、操作、清单和连续行动",
    triggers: /第一|第二|第三|步骤|然后|接着|依次|逐一/u,
  },
  {
    id: "not-but",
    sourceShape: "“不是……乃是……”式",
    fillableFrame:
      "这不是【被否定的输入判断／目的】，乃是【输入真正的判断／目的】。",
    useWhen: "纠正、澄清、反转和强调真实目的",
    triggers: /不是|并非|而是|其实|真正|实际上|不对|改为|应该/u,
    outputPattern: /不是.{1,48}乃是/u,
  },
  {
    id: "yes-no",
    sourceShape: "“你们的话，是，就说是；不是，就说不是”式",
    fillableFrame:
      "论到【输入中的决定】，你的话，是，就说是；不是，就说不是；不可再以【输入已有的含糊或拖延】遮掩。",
    useWhen: "逼迫表态、同意或拒绝、明确回答和二选一",
    triggers: /答应|不答应|同意|不同意|愿意|不愿意|说清|明确|二选一/u,
    outputPattern: /是.{0,8}就说是.{0,12}不是.{0,8}就说不是/u,
    constraints: "只用于要求明确表态或概括强制选择；不得把原本的拒绝改成答应，也不得增加新的决定。",
  },
  {
    id: "two-masters",
    sourceShape: "“一个人不能事奉两个主”式",
    fillableFrame:
      "一个人不能事奉两个主；不是归向【输入已有的立场一】，就是归向【立场二】。",
    useWhen: "站队、忠诚冲突、两面讨好和不可兼得",
    triggers: /站队|两边|两头|二选一|效忠|忠于|同时讨好|脚踏两只船/u,
    outputPattern: /不能.{0,20}(?:事奉|服事).{0,12}(?:两个|二主)/u,
  },
  {
    id: "former-now",
    sourceShape: "“本来……如今……”／“旧事已过，都变成新的了”式",
    fillableFrame:
      "【主体】从前【输入已有的旧状态】，如今却【输入已有的新状态】；先前的事已经过去，现今的事便显明了。",
    useWhen: "更新、修复、转变、前后对照和状态迁移",
    triggers: /以前|之前|后来|现在|如今|变成|变化|更新|升级|修复|恢复|重新/u,
  },
  {
    id: "chain-result",
    sourceShape: "“患难生忍耐；忍耐生老练；老练生盼望”式",
    fillableFrame:
      "【输入原因】生【结果一】；【结果一】又生【结果二】；【结果二】便使【最终结果】显明。",
    useWhen: "明确的三级因果、流程或逐步升级",
    triggers: /导致|造成|使得|因此|所以|结果|进而|最终|越来越/u,
  },
  {
    id: "sow-reap",
    sourceShape: "“人种的是什么，收的也是什么”式",
    fillableFrame:
      "【人物】所种的是什么，收的也是什么；他既【输入已有的行为】，就【输入已有的结果】。",
    useWhen: "自食其果、报应、付出与回报和明确行为后果",
    triggers: /自食其果|报应|种下|收获|付出.{0,20}得到|代价|咎由自取/u,
    outputPattern: /所种的是什么.{0,12}收的也是什么/u,
  },
  {
    id: "all-things-parallel",
    sourceShape: "“凡事……凡事……凡事……”式",
    fillableFrame:
      "凡【事项一】，【对应动作／结果一】；凡【事项二】，【对应动作／结果二】。",
    useWhen: "并列职责、多个对象、全面承诺或全面限制",
    triggers: /所有|全部|每个|任何|无论|都|一切|凡/u,
    outputPattern: /凡.{1,36}(?:必|都|也|不可)/u,
  },
  {
    id: "self-exalted",
    sourceShape: "“凡自高的，必降为卑”式",
    fillableFrame:
      "凡在【人物】面前自高的，必【输入已有的降卑、收敛或失败结果】；凡仗着【输入已有的资格或威势】自夸的，也不可任意而行。",
    useWhen: "气盛、狂妄、摆资格、压人和强者被迫收敛",
    triggers: /自高|高傲|骄傲|狂妄|气盛|嚣张|摆份|摆谱|压人|威势/u,
    outputPattern: /凡.{0,20}自高的.{0,12}必.{0,16}(?:卑|低|伏|卧|收敛|败)/u,
    constraints: "只交给劝诫、压制或警告自高者的一方；不可与维护自己气盛的发言合并。",
  },
  {
    id: "paired-fate",
    sourceShape: "“凡……的，必……；凡……的，也必……”式",
    fillableFrame:
      "凡是【输入中的第一类身份、人物或自称】的，必【第一类已有的动作或结果】；凡是【第二类身份、人物或自称】的，也必【第二类已有的动作或结果】。例如：凡自称龙的，必叫他盘着；凡自称虎的，也必叫他卧着。",
    useWhen: "龙与虎、两类人物、两种对象、并列身份及各自对应的处置",
    triggers: /龙.{0,20}虎|虎.{0,20}龙|无论.{0,24}(?:还是|或)|或者|一类.{0,20}另一类|两种/u,
    outputPattern: /凡(?:是)?.{1,20}的.{0,6}必.{1,20}[；，].{0,8}凡(?:是)?.{1,20}的.{0,8}(?:也)?必/u,
  },
  {
    id: "last-first",
    sourceShape: "“这样，那在后的，将要在前；在前的，将要在后了。”式",
    fillableFrame:
      "【输入中原先在后的】将要在前；【原先在前的】将要在后；【输入已有的次序变化】就显明了。",
    useWhen: "后来居上、次序逆转、资历与新旧地位",
    triggers: /后来居上|先来|后到|在前|在后|排位|次序|顺序|资历/u,
    outputPattern: /在后的.{0,12}(?:在前|要在前).{0,20}在前的.{0,12}(?:在后|要在后)/u,
  },
  {
    id: "sword-consequence",
    sourceShape: "“凡动刀的，必死在刀下”式",
    fillableFrame:
      "凡动【输入已有的刀械或暴力手段】的，必【输入已有的受伤、失败或报偿结果】。",
    useWhen: "刀械、攻击、威胁、伤害和暴力后果",
    triggers: /刀|动手|刺|砍|杀|伤|武器|扑上前/u,
    outputPattern: /凡动.{0,16}的.{0,8}必/u,
  },
  {
    id: "death-threat",
    sourceShape: "“我必夺取你的命”式（和合本常见威胁句法）",
    fillableFrame:
      "【威胁者】说：‘我必夺取【被威胁者】的命。’",
    useWhen: "弄死、杀死、取命、致死威胁和明确杀意",
    triggers: /弄死|杀死|宰了|干掉|取.{0,8}性命|要.{0,8}命|杀了你/u,
    outputPattern: /我必(?:夺取|取|断绝).{0,12}(?:你的命|他的命|她的命|性命)/u,
  },
  {
    id: "solemn-threat",
    sourceShape: "“我必使……”式（和合本常见宣告句法）",
    fillableFrame:
      "【人物】说：‘我必使【对象】【输入已有的威胁结果】；你若【触发条件】，这事必要临到你。’",
    useWhen: "非致死威胁、惩罚、报复和强硬后果",
    triggers: /收拾你|废了你|饶不了|没完|报复|惩罚|让你.{0,12}(?:后悔|好看|付出)/u,
    outputPattern: /我必使.{1,32}(?:若|必要|必定|不得)/u,
  },
  {
    id: "solemn-refusal",
    sourceShape: "“我断不……”式（和合本常见拒绝句法）",
    fillableFrame:
      "【人物】说：‘论到【输入中的请求或要求】，我断不【输入已有的拒绝事项】。’",
    useWhen: "拒绝、坚决不从、否认和不肯答应",
    triggers: /拒绝|不肯|不干|不去|不答应|不能答应|休想|绝不/u,
    outputPattern: /(?:论到.{0,20})?我断不.{1,36}/u,
  },
  {
    id: "solemn-obedience",
    sourceShape: "“我必照你所说的去行”式（和合本常见应允句法）",
    fillableFrame:
      "【人物】回答说：‘我必照你所说的去行。’",
    useWhen: "答应、承诺、接受要求和保证办理",
    triggers: /答应|同意|照办|照做|承诺|保证|一定办|肯定办/u,
    outputPattern: /我必照.{0,24}所说的.{0,16}(?:去行|行|办理)/u,
  },
  {
    id: "command-prohibition",
    sourceShape: "“你当……不可……”式（和合本常见晓谕句法）",
    fillableFrame:
      "【说话者】说：‘你当【输入已有的命令】；不可【输入已有的禁止事项】。’",
    useWhen: "命令、规劝、禁止、警告和行为要求",
    triggers: /必须|应该|你得|你要|不许|禁止|别再|不要再|不可/u,
    outputPattern: /你当.{1,32}(?:不可|免得)/u,
  },
  {
    id: "measure-return",
    sourceShape: "“你们用什么量器量给人，也必用什么量器量给你们”式",
    fillableFrame:
      "你用什么量器量给【对象】，也必用什么量器量给你；【输入已有的对等回应】。",
    useWhen: "以同样方式回应、加倍奉还、对等待遇和报偿",
    triggers: /怎么对我|如何待我|同样对待|加倍奉还|奉还|回敬|以牙还牙/u,
    outputPattern: /用什么量器.{0,20}也必用什么量器/u,
  },
  {
    id: "fruit-recognition",
    sourceShape: "“凭着他们的果子，就可以认出他们来”式",
    fillableFrame:
      "凭着【人物】所结的果子，就可以认出【人物】来；【输入已有的表现或结果】已经显明。",
    useWhen: "凭表现判断人物、名声验证、结果证明和识人",
    triggers: /表现|德行|名声|认出|识别|判断|看结果|证明/u,
    outputPattern: /凭着.{0,24}(?:果子|所行的).{0,12}就可以认出/u,
  },
  {
    id: "all-work-together",
    sourceShape: "“万事都互相效力，叫……得益处”式",
    fillableFrame:
      "【输入已有的多个因素】彼此作用，好叫【对象】得着【输入已有的结果】。",
    useWhen: "多个因素共同造成同一结果",
    triggers: /共同|一起|配合|协作|互相|综合|因素|团队/u,
  },
  {
    id: "behold-arrival",
    sourceShape: "“看哪，我必快来”／“我又看见……”式",
    fillableFrame:
      "看哪，【输入已经发生或明确将发生的事件】；【观察者】又看见【输入已有的景象／结果】。",
    useWhen: "突发出现、发布、抵达、发现和视觉场景",
    triggers: /看见|看到|发现|出现|来了|到达|发布|上线|突然|画面/u,
  },
] as const;

const CUV_EXPANDED_ANCHORS: readonly CuvAnchor[] = [
  {
    id: "in-the-beginning",
    sourceShape: "“起初，神创造天地。”式",
    fillableFrame:
      "起初，【人物】【输入已有的初始行动】；【最初形成的事物或局面】就有了。",
    useWhen: "开端、创建、创业、启动、最初状态和故事起因",
    triggers: /起初|一开始|最初|开头|创立|创建|创业|启动|发起/u,
    outputPattern: /起初.{2,48}/u,
  },
  {
    id: "what-is-in-hand",
    sourceShape: "“你手里是什么？”式",
    fillableFrame:
      "【人物】问他说：‘你手里是什么？’他回答说：‘是【输入已有的工具、物品或凭据】。’",
    useWhen: "询问工具、证据、武器、物品和现有资源",
    triggers: /手里|手中|拿着|工具|武器|证据|凭据|有什么东西/u,
    outputPattern: /你手里是什么/u,
  },
  {
    id: "let-my-people-go",
    sourceShape: "“容我的百姓去。”式",
    fillableFrame:
      "【人物】说：‘容【输入中被拦阻的人或对象】去；不可再拦阻他。’",
    useWhen: "放人、释放、放行、解除阻拦和要求离开",
    triggers: /放人|放走|释放|放行|让.{0,12}走|松开|别拦|不要拦/u,
    outputPattern: /容.{1,24}去.{0,16}不可再拦阻/u,
  },
  {
    id: "bring-the-sword",
    sourceShape: "“王说：‘拿刀来！’人就拿刀来。”式",
    fillableFrame:
      "【人物】说：‘把【输入已有的物品】拿来！’人就把【物品】拿到他面前。",
    useWhen: "命人取物、拿来工具、递交物品和立即执行",
    triggers: /拿来|取来|拿刀|把.{0,12}拿来|递过来|送来/u,
    outputPattern: /把.{1,20}拿来.{0,16}人就/u,
  },
  {
    id: "why-forsaken",
    sourceShape: "“我的神！我的神！为什么离弃我？”式",
    fillableFrame:
      "【人物】呼喊说：‘我的【输入已有的亲近关系】！我的【同一关系】！为什么离弃我？’",
    useWhen: "被抛弃、背叛、无人理会、失望和强烈质问",
    triggers: /抛弃|离弃|背叛|不管我|不理我|丢下我|为什么离开/u,
    outputPattern: /我的.{1,16}我的.{1,16}为什么离弃我/u,
  },
  {
    id: "declare-and-proclaim",
    sourceShape: "“诸天述说神的荣耀；穹苍传扬他的手段。”式",
    fillableFrame:
      "【输入中的证据或表现一】述说【人物或事物的特点】；【证据或表现二】传扬【同一事实】。",
    useWhen: "展示、宣传、传播、彰显、证明和名声远扬",
    triggers: /展示|宣传|传播|传扬|彰显|证明|显出|名声远扬/u,
    outputPattern: /述说.{1,28}[；，].{0,12}传扬/u,
  },
  {
    id: "deep-calls-deep",
    sourceShape: "“深渊就与深渊响应。”式",
    fillableFrame:
      "【输入中的一方】就与【另一方】响应；【双方已有的呼应或共鸣】便显明了。",
    useWhen: "响应、呼应、共鸣、互相回应和同类相感",
    triggers: /响应|呼应|共鸣|回应|一呼百应|同声相应/u,
    outputPattern: /就与.{1,20}响应/u,
  },
  {
    id: "lazy-lion-excuse",
    sourceShape: "“懒惰人说：‘外头有狮子；我在街上就必被杀。’”式",
    fillableFrame:
      "【人物】为自己寻找借口，说：‘外头有【输入已有或夸张的阻碍】；我若出去，就必【他所惧怕的结果】。’",
    useWhen: "懒惰、推脱、夸大困难、借口和畏难不前",
    triggers: /借口|懒惰|偷懒|不想做|不愿做|怕.{0,16}所以|推脱|畏难/u,
    outputPattern: /外头有.{1,20}我若.{1,24}就必/u,
  },
  {
    id: "nothing-new-under-sun",
    sourceShape: "“日光之下并无新事。”式",
    fillableFrame:
      "论到【输入中的重复现象】，日光之下并无新事；从前所有的，如今又有了。",
    useWhen: "老套路、重复发生、没有新意和似曾相识",
    triggers: /老套路|不新鲜|没有新意|重复发生|以前也有|又来了|似曾相识/u,
    outputPattern: /日光之下并无新事/u,
  },
  {
    id: "wait-renew-strength",
    sourceShape: "“但那等候耶和华的必从新得力。”式",
    fillableFrame:
      "但那等候【输入中的人、时机或结果】的，必从新得力；他必【输入已有的恢复行动】。",
    useWhen: "等待、耐心、恢复精力、重新振作和蓄势",
    triggers: /等待|等候|耐心|重新振作|恢复精力|蓄力|缓一缓/u,
    outputPattern: /但那等候.{1,24}的.{0,8}必从新得力/u,
  },
  {
    id: "stand-and-ask-old-paths",
    sourceShape: "“你们当站在路上察看，访问古道。”式",
    fillableFrame:
      "你们当站在【输入中的选择处】察看，访问【已有的旧方案或旧经验】，看哪一条是善道，便行在其间。",
    useWhen: "观察、检查、调查、评估方案、选择路线和复盘经验",
    triggers: /观察|察看|检查|调查|评估|选择路线|方案比较|复盘|旧经验/u,
    outputPattern: /当站在.{1,20}察看.{0,16}(?:访问|看哪一条)/u,
  },
  {
    id: "kingdom-is-like",
    sourceShape: "“天国好像……”式",
    fillableFrame:
      "论到【输入中的事物】，它好像【输入已有的比喻对象】；【相似关系】也是这样。",
    useWhen: "比喻、类比、形象说明和用一个事物解释另一个事物",
    triggers: /好像|如同|仿佛|类似|比喻|就像|像是/u,
    outputPattern: /论到.{1,20}好像.{1,28}也是这样/u,
  },
  {
    id: "lost-and-found",
    sourceShape: "“是死而复活、失而又得的。”式",
    fillableFrame:
      "【输入中失去后恢复的人或事物】先前是失去的，如今又得着了；先前如同死了，如今又活了。",
    useWhen: "失而复得、找回、恢复、回归、重获和重新启用",
    triggers: /找回|失而复得|恢复|回来|回归|重获|重新启用|寻回/u,
    outputPattern: /先前是失去的.{0,16}如今又得着了/u,
  },
  {
    id: "word-at-beginning",
    sourceShape: "“太初有道，道与神同在，道就是神。”式",
    fillableFrame:
      "起初有【输入中的原则、理念或话语】；这【原则或话语】与【主体】同在，这就是【输入已有的核心判断】。",
    useWhen: "核心理念、根本原则、口号、准则和事物本质",
    triggers: /理念|原则|口号|准则|核心|根本|本质|信条/u,
    outputPattern: /起初有.{1,20}.{0,16}同在.{0,16}这就是/u,
  },
  {
    id: "all-made-through",
    sourceShape: "“凡被造的，没有一样不是借着他造的。”式",
    fillableFrame:
      "凡【输入中的成品或结果】，没有一样不是借着【人物、工具或过程】作成的。",
    useWhen: "统一来源、全部由某人完成、共同工具和制造归属",
    triggers: /全部由|都是.{0,12}做的|没有一个不是|统一来源|出自|制作完成/u,
    outputPattern: /凡.{1,20}没有一样不是借着.{1,24}(?:作成|完成|造)/u,
  },
  {
    id: "heard-and-cut",
    sourceShape: "“众人听见这话，觉得扎心。”式",
    fillableFrame:
      "众人听见这话，觉得【输入已有的震动、难受或触动】；就彼此问说：【输入已有的问题】。",
    useWhen: "听见消息后震惊、难受、触动、沉默和追问",
    triggers: /听见.{0,16}(?:震惊|难受|沉默|触动)|扎心|震撼|听完.*不说话/u,
    outputPattern: /众人听见这话.{0,16}觉得/u,
  },
  {
    id: "while-still-speaking",
    sourceShape: "“彼得还说这话的时候……”式",
    fillableFrame:
      "【人物】还说这话的时候，【输入中同时或突然发生的事件】就临到了。",
    useWhen: "话未说完、同时发生、突然打断和紧接着出现",
    triggers: /还没说完|话音未落|正在说|说话的时候|刚说到|突然打断/u,
    outputPattern: /还说这话的时候.{1,32}(?:就|忽然)/u,
  },
  {
    id: "desired-good-not-done",
    sourceShape: "“我所愿意的善，我反不作；我所不愿意的恶，我倒去作。”式",
    fillableFrame:
      "我所愿意【输入中想做的事】，我反不作；我所不愿意【不想发生的事】，我倒去作。",
    useWhen: "事与愿违、拖延、控制不住、想做未做和反向行动",
    triggers: /想做却没做|不想却|事与愿违|拖延|控制不住|反而做了|偏偏/u,
    outputPattern: /我所愿意.{1,24}我反不作.{0,20}我所不愿意.{1,24}我倒去作/u,
  },
  {
    id: "love-is-patient",
    sourceShape: "“爱是恒久忍耐，又有恩慈；爱是不嫉妒。”式",
    fillableFrame:
      "【输入中的关系或担当】是恒久忍耐，又有恩慈；【关系或担当】不【输入已有的相反行为】。",
    useWhen: "爱、耐心、恩慈、照顾、宽容和长期担当",
    triggers: /爱|耐心|恩慈|照顾|宽容|体谅|长期陪伴/u,
    outputPattern: /是恒久忍耐.{0,12}又有恩慈/u,
  },
  {
    id: "love-bears-all",
    sourceShape: "“凡事包容，凡事相信，凡事盼望，凡事忍耐。”式",
    fillableFrame:
      "凡【输入事项一】都包容，凡【事项二】都相信，凡【事项三】仍盼望，凡【已有的困难】仍忍耐。",
    useWhen: "全面包容、信任、盼望、坚持和多项长期承诺",
    triggers: /包容|相信|盼望|忍耐|无条件|一直支持|始终相信/u,
    outputPattern: /凡.{0,16}包容.{0,16}凡.{0,16}相信.{0,16}凡.{0,16}盼望/u,
  },
  {
    id: "faith-and-works",
    sourceShape: "“你有信心，我有行为。”式",
    fillableFrame:
      "你有【输入中的主张、信心或计划】，我有【输入中的行动、证据或成果】；便将你的【主张】指给我看，我就借着【行动】显明。",
    useWhen: "空谈与行动、计划与执行、主张与证据和实践检验",
    triggers: /信心|行动|空谈|实践|执行|拿结果说话|证明给你看/u,
    outputPattern: /你有.{1,20}我有.{1,20}(?:行动|行为|证据|成果)/u,
  },
  {
    id: "salt-and-light",
    sourceShape: "“你们是世上的盐……你们是世上的光。”式",
    fillableFrame:
      "【人物或群体】是【输入范围】的盐，也是【输入范围】的光；【输入已有的作用】不可隐藏。",
    useWhen: "榜样、价值、作用、影响、照亮和不可替代的角色",
    triggers: /榜样|价值|作用|照亮|影响|不可替代|带头|标杆/u,
    outputPattern: /是.{1,16}的盐.{0,16}也是.{1,16}的光/u,
  },
  {
    id: "burden-and-rest",
    sourceShape: "“凡劳苦担重担的人，可以到我这里来，我就使你们得安息。”式",
    fillableFrame:
      "凡为【输入事项】劳苦担重担的人，可以到【提供帮助者】这里来，他就使他们得【输入已有的休息或帮助】。",
    useWhen: "劳累、压力、加班、负担、求助、休息和接手工作",
    triggers: /劳累|很累|压力|负担|加班|休息|喘口气|接手|帮忙分担/u,
    outputPattern: /凡.{1,20}劳苦担重担的人.{0,20}就使.{0,16}得/u,
  },
  {
    id: "golden-rule",
    sourceShape: "“你们愿意人怎样待你们，你们也要怎样待人。”式",
    fillableFrame:
      "你愿意【对象】怎样待你，你也要怎样待【对象】；【输入已有的对等原则】就在这里。",
    useWhen: "换位思考、互相尊重、对等待遇和将心比心",
    triggers: /怎样对待|如何待我|互相尊重|换位思考|将心比心|公平对待/u,
    outputPattern: /愿意.{1,20}怎样待你.{0,16}也要怎样待/u,
  },
  {
    id: "seek-first",
    sourceShape: "“你们要先求他的国和他的义，这些东西都要加给你们了。”式",
    fillableFrame:
      "你们要先求【输入中的最高优先事项】；【其余已有事项】都要随后加给你们了。",
    useWhen: "优先级、先做关键事项、第一要务和主次安排",
    triggers: /优先|先做|首先|第一要务|最重要|排在前面|主次/u,
    outputPattern: /要先求.{1,24}.{0,20}都要随后/u,
  },
  {
    id: "strength-to-do-all",
    sourceShape: "“我靠着那加给我力量的，凡事都能作。”式",
    fillableFrame:
      "我靠着【输入中提供力量、资源或支持的人或物】，凡【输入已有的事项】都能作。",
    useWhen: "能力、信心、资源支持、得到帮助和完成困难事项",
    triggers: /力量|能力|能做到|支持我|帮助我|资源|有把握|一定能/u,
    outputPattern: /我靠着.{1,24}凡.{1,24}都能作/u,
  },
  {
    id: "nothing-anxious",
    sourceShape: "“应当一无挂虑，只要凡事借着祷告、祈求和感谢……”式",
    fillableFrame:
      "论到【输入中的担忧】，应当一无挂虑；只要将【已有的请求、信息或困难】告诉【对象】。",
    useWhen: "焦虑、担忧、沟通、求助、汇报问题和说出需求",
    triggers: /焦虑|挂虑|担忧|忧心|说出需求|告诉他|沟通|汇报困难/u,
    outputPattern: /应当一无挂虑.{0,16}只要将.{1,24}告诉/u,
  },
  {
    id: "valley-no-fear",
    sourceShape: "“我虽然行过死荫的幽谷，也不怕遭害。”式",
    fillableFrame:
      "我虽然行过【输入已有的危险、低谷或困境】，也不怕【输入已有的伤害或失败】，因为【已有的依靠】与我同在。",
    useWhen: "危险、低谷、困难、恐惧、逆境和有依靠而不怕",
    triggers: /危险|低谷|困境|不怕|恐惧|害怕|艰难|逆境/u,
    outputPattern: /我虽然行过.{1,24}也不怕/u,
  },
  {
    id: "tears-and-harvest",
    sourceShape: "“流泪撒种的，必欢呼收割。”式",
    fillableFrame:
      "那为【输入事项】流泪撒种的，必因【输入已有的成果】欢呼收割。",
    useWhen: "辛苦付出、坚持、苦尽甘来、投入后收获和长期努力",
    triggers: /辛苦|付出|坚持|苦尽甘来|终于有收获|努力有回报|熬过/u,
    outputPattern: /流泪撒种的.{0,12}必.{0,16}欢呼收割/u,
  },
  {
    id: "appointed-day-rejoice",
    sourceShape: "“这是耶和华所定的日子，我们在其中要高兴欢喜。”式",
    fillableFrame:
      "这是【输入中的人物或安排者】所定的日子；我们在其中要因【已有的喜事】高兴欢喜。",
    useWhen: "庆祝、纪念日、成功、喜讯、聚会和值得高兴的时刻",
    triggers: /庆祝|纪念日|高兴|欢喜|喜讯|成功了|值得庆贺|聚会/u,
    outputPattern: /这是.{1,20}所定的日子.{0,20}高兴欢喜/u,
  },
  {
    id: "be-still-and-know",
    sourceShape: "“你们要休息，要知道我是神。”式",
    fillableFrame:
      "你们要休息，要知道【输入已有的确定事实】；不可再因【已有的纷扰】摇动。",
    useWhen: "冷静、停止争论、安静、休息和确认事实",
    triggers: /冷静|停下|休息|安静|别吵|停止争论|先缓缓/u,
    outputPattern: /你们要休息.{0,12}要知道/u,
  },
  {
    id: "light-salvation-fear",
    sourceShape: "“耶和华是我的亮光，是我的拯救，我还怕谁呢？”式",
    fillableFrame:
      "【输入中的依靠者】是我的亮光，是我的拯救；我还怕【输入中的对手或危险】呢？",
    useWhen: "靠山、保护、救援、面对强敌不怕和获得安全感",
    triggers: /靠山|保护我|救援|拯救|我怕谁|不用怕|有人撑腰/u,
    outputPattern: /是我的亮光.{0,12}是我的拯救.{0,12}我还怕/u,
  },
  {
    id: "heart-plans-way",
    sourceShape: "“人心筹算自己的道路；惟耶和华指引他的脚步。”式",
    fillableFrame:
      "【人物】心里筹算自己的道路；惟有【输入中真正决定方向的人、规则或事实】指引他的脚步。",
    useWhen: "计划、筹划、路线、方向、安排和最终受现实决定",
    triggers: /计划|筹划|路线|方向|安排|打算|规划|脚步/u,
    outputPattern: /心里筹算自己的道路.{0,16}(?:惟有|却由).{1,24}指引他的脚步/u,
  },
  {
    id: "commit-and-establish",
    sourceShape: "“当将你的事交托耶和华，你所谋的就必成立。”式",
    fillableFrame:
      "当将【输入中的事项】交托【负责者】；你所谋的若蒙他接纳，就必【输入已有的成立或完成结果】。",
    useWhen: "委托、交给负责人、托付、项目交接和计划成立",
    triggers: /委托|交托|托付|交给.{0,12}负责|项目交接/u,
    outputPattern: /当将.{1,24}交托.{1,20}你所谋的.{0,16}就必/u,
  },
  {
    id: "iron-sharpens-iron",
    sourceShape: "“铁磨铁，磨出刃来；朋友相感也是如此。”式",
    fillableFrame:
      "【人物一】磨【人物二】，如同铁磨铁，磨出刃来；【双方已有的互相促进】也是如此。",
    useWhen: "切磋、朋友互相促进、同事磨合、竞争成长和彼此提醒",
    triggers: /切磋|互相促进|朋友|同事|磨合|竞争成长|彼此提醒/u,
    outputPattern: /如同铁磨铁.{0,12}磨出刃来.{0,16}也是如此/u,
  },
  {
    id: "wages-and-gift",
    sourceShape: "“罪的工价乃是死；惟有神的恩赐……乃是永生。”式",
    fillableFrame:
      "【输入中错误行为】的工价乃是【已有的惩罚或损失】；惟有【正确行为或所得帮助】的恩赐，乃是【已有的正面结果】。",
    useWhen: "代价、惩罚与奖励、错误与正确结果和强烈对照",
    triggers: /代价|工价|惩罚|奖励|错误后果|正面结果|付出代价/u,
    outputPattern: /的工价乃是.{1,20}[；，].{0,12}的恩赐.{0,12}乃是/u,
  },
  {
    id: "healthy-need-no-doctor",
    sourceShape: "“康健的人用不着医生，有病的人才用得着。”式",
    fillableFrame:
      "【输入中没有问题的人或事】用不着【帮助者或修复手段】；有【输入已有的问题】的，才用得着。",
    useWhen: "有问题才需帮助、维修、医生、顾问和按需处理",
    triggers: /医生|生病|维修|有问题|没问题|需要帮助|顾问|修复/u,
    outputPattern: /用不着.{1,20}.{0,16}才用得着/u,
  },
  {
    id: "truth-makes-free",
    sourceShape: "“你们必晓得真理，真理必叫你们得以自由。”式",
    fillableFrame:
      "你们必晓得【输入已有的真相】；这真相必叫【对象】【输入已有的摆脱、澄清或自由结果】。",
    useWhen: "真相、揭露、澄清、公开信息、摆脱误解和获得自由",
    triggers: /真相|真理|揭露|澄清|公开信息|自由|摆脱误解/u,
    outputPattern: /必晓得.{1,24}.{0,12}必叫.{1,24}/u,
  },
  {
    id: "first-stone",
    sourceShape: "“你们中间谁是没有罪的，谁就可以先拿石头打她。”式",
    fillableFrame:
      "你们中间谁是没有【输入中的同类过错】的，谁就可以先【输入已有的指责或惩罚动作】。",
    useWhen: "指责别人、双重标准、先反省、资格质疑和人人有错",
    triggers: /指责|批评|谁没错|先反省|双重标准|没资格说|都有错/u,
    outputPattern: /中间谁是没有.{1,20}的.{0,12}谁就可以先/u,
  },
  {
    id: "grain-dies-bears-much",
    sourceShape: "“一粒麦子不落在地里死了……若是死了，就结出许多子粒来。”式",
    fillableFrame:
      "【输入中的一份资源、机会或旧状态】若不放下，仍旧是一个；若肯【输入已有的牺牲或投入】，就必结出【已有的增长结果】来。",
    useWhen: "牺牲、投入、放弃旧状态、成长、复制和倍增",
    triggers: /牺牲|投入|放弃|成长|倍增|复制|舍不得|以小博大/u,
    outputPattern: /若不.{1,20}仍旧是一个.{0,20}若肯.{1,20}就必结出/u,
  },
  {
    id: "render-to-owner",
    sourceShape: "“凯撒的物当归给凯撒；神的物当归给神。”式",
    fillableFrame:
      "【人物一】的物当归给【人物一】；【人物二】的物当归给【人物二】；各人当得自己的份。",
    useWhen: "归还、归属、物归原主、分账、产权和各得其所",
    triggers: /归还|归属|谁的|物归原主|各归其主|分账|产权|还给/u,
    outputPattern: /的物当归给.{1,16}[；，].{1,16}的物当归给/u,
  },
  {
    id: "perfect-love-casts-fear",
    sourceShape: "“爱里没有惧怕；爱既完全，就把惧怕除去。”式",
    fillableFrame:
      "【输入中的信任、爱或保障】里没有惧怕；【这关系】既完全，就把【输入已有的恐惧】除去。",
    useWhen: "信任消除恐惧、安心、关系稳固、获得保障和不再害怕",
    triggers: /信任|爱|安心|不再害怕|消除恐惧|安全感|放心/u,
    outputPattern: /里没有惧怕.{0,16}既完全.{0,12}把.{0,16}除去/u,
  },
] as const;

const CUV_STORY_ANCHORS: readonly CuvAnchor[] = [
  {
    id: "come-inside",
    sourceShape: "“请进，为什么站在外边呢？我已经收拾了房屋。”式",
    fillableFrame:
      "【迎接者】说：‘请进，为什么站在外边呢？【输入已有的屋子、座位或筵席】已经预备齐了。’",
    useWhen: "迎客、进入房间、邀请入座和场景开篇",
    triggers: /里面请|请进|进来|进入|饭店|房间|屋里|雅间|包间/u,
    outputPattern: /请进.{0,20}为什么站在外边.{0,28}(?:预备|收拾)/u,
    constraints: "只能由迎接者对来客说；若寒暄不重要，可以把原有多句欢迎合并成这一句。",
  },
  {
    id: "come-and-dine",
    sourceShape: "“你们来吃早饭。”式",
    fillableFrame:
      "【主人】对众人说：‘你们来，在【输入已有的席间或地方】吃喝。’众人就【输入已有的坐席动作】。",
    useWhen: "吃饭、喝酒、设席、赴宴和招呼落座",
    triggers: /吃饭|喝酒|酒席|筵席|落座|坐下|请坐|吃喝/u,
    outputPattern: /你们来.{0,24}(?:吃|喝|坐席).{0,24}众人就/u,
    constraints: "输入只有邀请而尚未落座时，不可补写众人已经坐下。",
  },
  {
    id: "sit-in-ranks",
    sourceShape: "“众人就一排一排地坐下。”式",
    fillableFrame:
      "众人就按着【输入已有的座次或同行关系】坐席；【人物一】在【人物二】近旁，众人都在席间。",
    useWhen: "多人落座、座次、分列、同行者和宴席场景",
    triggers: /众人.{0,12}坐|坐在|落座|座次|分列|两旁|酒桌/u,
    outputPattern: /众人就.{0,20}坐席.{0,24}席间/u,
  },
  {
    id: "table-prepared",
    sourceShape: "“你在我面前为我摆设筵席。”式",
    fillableFrame:
      "【主人】在【来客】面前摆设筵席；【输入已有的酒食或礼物】也陈在席前。",
    useWhen: "饭局、摆席、酒食、礼物放在席前和宴请",
    triggers: /摆设|摆好|酒席|饭局|饭桌|桌上|礼物|酒菜/u,
    outputPattern: /在.{0,16}面前摆设筵席.{0,24}(?:陈在|席前)/u,
    constraints: "摆席者、来客和礼物归属必须来自输入；不可凭空增加宴请者。",
  },
  {
    id: "silver-gold-none",
    sourceShape: "“金银我都没有，只把我所有的给你。”式",
    fillableFrame:
      "【赠与者】说：‘金银般贵重的物我没有；只把我手中所有的【输入已有的薄礼或帮助】给你。’",
    useWhen: "薄礼、小意思、能力有限但仍愿给出和谦称礼物",
    triggers: /小意思|薄礼|不贵重|礼物|礼品|一点心意|微薄/u,
    outputPattern: /金银.{0,12}我没有.{0,16}只把我.{0,16}所有的/u,
    constraints: "只能表达输入已有的礼物或帮助，不得把无偿赠与改成借贷或债务。",
  },
  {
    id: "freely-give",
    sourceShape: "“你们白白地得来，也要白白地舍去。”式",
    fillableFrame:
      "【人物】既【输入已有的无偿所得或受助】，也当【输入已有的无偿给予或回报】；白白地得来，也白白地舍去。",
    useWhen: "无偿帮助、礼尚往来、免费、赠送和不计代价",
    triggers: /免费|无偿|白送|赠送|不收钱|礼尚往来|回报/u,
    outputPattern: /白白地得来.{0,16}白白地舍去/u,
  },
  {
    id: "good-name-riches",
    sourceShape: "“美名胜过大财；恩宠强如金银。”式",
    fillableFrame:
      "【人物】的美名胜过【输入已有的财物或利益】；他在众人中所得的【名望或情分】，强如金银。",
    useWhen: "名声、名望、面子、江湖地位和众人听闻",
    triggers: /名声|名望|有名|有头有脸|面子|听说|略知一二/u,
    outputPattern: /美名胜过.{0,20}(?:名望|情分).{0,12}强如金银/u,
  },
  {
    id: "friend-in-adversity",
    sourceShape: "“朋友乃时常亲爱，弟兄为患难而生。”式",
    fillableFrame:
      "朋友乃时常亲爱；【输入中的兄弟或同伴】为【输入已有的患难、争端或责任】而生。",
    useWhen: "兄弟、朋友、义气、情分、互相照应和共同承担",
    triggers: /兄弟|朋友|义气|情分|照应|患难|自己人/u,
    outputPattern: /朋友乃时常亲爱.{0,16}弟兄.{0,12}而生/u,
    constraints: "只说明输入已有的同伴关系；不可借此反转谁依靠谁或谁供养谁。",
  },
  {
    id: "life-for-friends",
    sourceShape: "“人为朋友舍命，人的爱心没有比这个大的。”式",
    fillableFrame:
      "【人物】肯为【输入中的朋友或同伴】【输入已有的担当或冒险】；人为朋友【对应行动】，情分没有比这个大的。",
    useWhen: "讲义气、为朋友出头、保护同伴和承担风险",
    triggers: /为.{0,12}出头|讲义气|重情分|保护朋友|替.{0,12}承担|舍命/u,
    outputPattern: /人为朋友.{1,20}(?:情分|爱心).{0,12}没有比这个大/u,
    constraints: "输入没有死亡或舍命时，只替换为已有的担当动作，不得新增死亡。",
  },
  {
    id: "lend-do-not-refuse",
    sourceShape: "“有求你的，就给他；有向你借贷的，不可推辞。”式",
    fillableFrame:
      "有向【人物】求【输入已有之物】的，【人物】就【输入已有的回应】；有向他借贷的，他也【输入已有的借贷态度】。",
    useWhen: "借钱、借物、请求、拒绝借贷和债务争议",
    triggers: /借钱|借贷|借用|欠钱|还钱|周转|贷款/u,
    outputPattern: /有向.{0,16}求.{0,20}有向.{0,16}借贷/u,
    constraints: "借款人、出借人、是否归还和金额方向绝不可颠倒；原文拒绝时必须保留拒绝。",
  },
  {
    id: "reason-together",
    sourceShape: "“你们来，我们彼此辩论。”式",
    fillableFrame:
      "【人物】说：‘你来，我们为【输入中的争议】彼此辩论；将你所要说的陈明在我面前。’",
    useWhen: "摊牌、谈判、把话说开、解释争议和要求直说",
    triggers: /直说|挑明|摊牌|谈谈|说清楚|解释|争论|辩论/u,
    outputPattern: /你来.{0,16}彼此辩论.{0,24}陈明在我面前/u,
    constraints: "只能由发起谈判或要求说明的人说；不得借此增加双方已达成和解。",
  },
  {
    id: "answer-before-hearing",
    sourceShape: "“未曾听完先回答的，便是他的愚昧和羞辱。”式",
    fillableFrame:
      "【人物】未曾听完就【输入已有的插话、斥责或回答】；未曾听完先回答的，便显出【输入已有的冒失或无礼】。",
    useWhen: "插嘴、打断、抢话、未听完就骂和冒失回应",
    triggers: /插嘴|打断|抢话|未听完|突然骂|开口骂/u,
    outputPattern: /未曾听完.{0,16}先回答的.{0,20}(?:愚昧|无礼|冒失)/u,
  },
  {
    id: "quick-hear-slow-anger",
    sourceShape: "“快快地听，慢慢地说，慢慢地动怒。”式",
    fillableFrame:
      "【人物】本当快快地听，慢慢地说，慢慢地动怒；他却【输入已有的急躁言行】。",
    useWhen: "急躁、发怒、打断、喝骂和劝人冷静",
    triggers: /急躁|发怒|恼怒|生气|喝骂|冲动|冷静/u,
    outputPattern: /快快地听.{0,12}慢慢地说.{0,12}慢慢地动怒/u,
  },
  {
    id: "life-death-tongue",
    sourceShape: "“生死在舌头的权下。”式",
    fillableFrame:
      "生死在【人物】舌头的权下；他口中所出的【输入已有的威胁或决定】，必【输入已有的影响】。",
    useWhen: "严重威胁、言语改变局势、命令和一句话引发冲突",
    triggers: /威胁|弄死|杀|一句话|说完.{0,12}扑|喝道/u,
    outputPattern: /生死在.{0,12}舌头的权下.{0,24}口中所出的/u,
    constraints: "结果必须来自输入；不得因使用“生死”就把受伤升级为死亡。",
  },
  {
    id: "arise-let-us-go",
    sourceShape: "“起来，我们走吧！”式",
    fillableFrame:
      "【人物】对同行的人说：‘起来，我们走吧。’他们就【输入已有的离席或离开动作】。",
    useWhen: "起身、离席、带人离开和故事转场",
    triggers: /起身|站起来|离开|走吧|准备走|带着.{0,12}走/u,
    outputPattern: /起来.{0,8}我们走吧.{0,20}他们就/u,
    constraints: "输入只说预备离开而被叫停时，必须保留被叫停，不可提前写成已经离去。",
  },
  {
    id: "never-spoke-like-this",
    sourceShape: "“从来没有像他这样说话的。”式",
    fillableFrame:
      "【人物】说：‘从我幼年直到今日，从来没有人像你这样对我说话。’",
    useWhen: "从未有人敢这样说、震惊于对方言语和资历式回顾",
    triggers: /从来没有|没人敢|长这么大|自从.{0,12}以来|未曾有人/u,
    outputPattern: /从我幼年直到今日.{0,20}从来没有人.{0,16}这样/u,
  },
  {
    id: "bind-strong-man",
    sourceShape: "“若不先捆住那壮士，怎能抢夺他的家财呢？”式",
    fillableFrame:
      "【人物】先制住【输入中的阻拦者】；若不先制住他，怎能【输入已有的后续行动】呢？",
    useWhen: "制住、按住、拦阻强者和使某人不能上前",
    triggers: /制住|按住|捆住|不能上前|拦住|控制住/u,
    outputPattern: /若不先.{0,8}(?:制住|捆住|按住).{0,16}怎能/u,
    constraints: "只写输入已有的制止及其直接作用，不得新增抢夺、杀伤或后续攻击。",
  },
  {
    id: "blood-from-ground",
    sourceShape: "“你兄弟的血有声音从地里向我哀告。”式",
    fillableFrame:
      "【受伤者】的血落在【输入已有的地面】；那血在众人眼前作了【输入已有冲突结果】的见证。",
    useWhen: "流血、鲜血落地、受伤结果和冲突后的视觉收束",
    triggers: /鲜血|流血|血滴|血流|地板|地上/u,
    outputPattern: /的血落在.{0,16}那血在众人眼前/u,
    constraints: "只能写受伤者真实流出的血；不得暗示原文没有的死亡或神圣审判。",
  },
  {
    id: "passed-through-midst",
    sourceShape: "“他却从他们中间直行，过去了。”式",
    fillableFrame:
      "【人物】却从【输入中的众人或阻拦者】中间直行，过去了；【同行者】也随他离去。",
    useWhen: "从容离开、无人拦住、穿过众人和冲突后的退场",
    triggers: /从容离开|离去|走了|骑走|无人敢拦|眼看着.{0,12}离开/u,
    outputPattern: /却从.{1,20}中间直行.{0,8}过去了/u,
    constraints: "原文若有人成功拦下、追赶或抓住，不可使用此骨架。",
  },
  {
    id: "what-shall-i-do",
    sourceShape: "“你要我为你做什么？”式",
    fillableFrame:
      "【人物】问【对方】说：‘你要我为你做什么？论到【输入中的请求】，只管陈明。’",
    useWhen: "询问来意、要求直说、问对方想怎样和确认请求",
    triggers: /什么事|有何事|想怎样|要我做什么|怎么走|有话直说/u,
    outputPattern: /你要我为你做什么.{0,24}只管陈明/u,
    constraints: "只能用于询问对方真实要求；不可把威胁者和被威胁者调换。",
  },
];

export const CUV_FAMOUS_ANCHORS: readonly CuvAnchor[] = [
  ...CUV_CORE_ANCHORS,
  ...CUV_EXPANDED_ANCHORS,
  ...CUV_STORY_ANCHORS,
];

const FALLBACK_ANCHOR_IDS = [
  "not-but",
  "all-things-parallel",
  "identity-consequence",
  "chain-result",
  "behold-arrival",
];

const ANCHOR_PRIORITY = [
  "come-inside",
  "come-and-dine",
  "table-prepared",
  "silver-gold-none",
  "good-name-riches",
  "friend-in-adversity",
  "life-for-friends",
  "lend-do-not-refuse",
  "reason-together",
  "answer-before-hearing",
  "quick-hear-slow-anger",
  "life-death-tongue",
  "arise-let-us-go",
  "never-spoke-like-this",
  "bind-strong-man",
  "blood-from-ground",
  "passed-through-midst",
  "what-shall-i-do",
  "sit-in-ranks",
  "freely-give",
  "request-favor",
  "not-but",
  "you-have-i-have",
  "name-declaration",
  "death-threat",
  "known-who-question",
  "self-exalted",
  "paired-fate",
  "young-not-despised",
  "sword-consequence",
  "solemn-threat",
  "solemn-refusal",
  "solemn-obedience",
  "command-prohibition",
  "heart-mouth",
  "yes-no",
  "all-things-parallel",
  "you-me-confrontation",
  "appointed-time",
  "last-first",
  "brother-keeper",
  "two-masters",
  "measure-return",
  "fruit-recognition",
  "former-now",
  "chain-result",
  "sow-reap",
  "tomorrow-worry",
  "ask-seek-parallel",
  "identity-consequence",
  "command-result",
  "soft-hard-consequence",
  "vanity-repetition",
  "blessed-because",
  "unworthiness-question",
  "all-work-together",
  "behold-arrival",
] as const;

export function selectCuvAnchors(text: string, limit = 16) {
  const priority = new Map<string, number>(
    ANCHOR_PRIORITY.map((id, index) => [id, index]),
  );
  const selected = CUV_FAMOUS_ANCHORS.filter((anchor) =>
    anchor.triggers.test(text),
  ).sort(
    (left, right) =>
      (priority.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (priority.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  if (selected.length >= limit) return selected.slice(0, limit);

  for (const id of FALLBACK_ANCHOR_IDS) {
    const anchor = CUV_FAMOUS_ANCHORS.find((item) => item.id === id);
    if (anchor && !selected.includes(anchor)) selected.push(anchor);
    if (selected.length >= Math.min(limit, 5)) break;
  }

  return selected;
}

export function buildCuvAnchorPrompt(text: string) {
  const anchors = selectCuvAnchors(text);
  const requiredCount = Math.min(
    requiredFamousAnchorStyleScore(text),
    anchors.length,
  );
  const frames = anchors
    .map(
      (anchor, index) =>
        `${index + 1}. ${index < requiredCount ? "【本篇必用】" : "【可选】"}${anchor.sourceShape}\n   骨架：${anchor.fillableFrame}\n   适用：${anchor.useWhen}${anchor.constraints ? `\n   约束：${anchor.constraints}` : ""}`,
    )
    .join("\n");

  return `本次指定的著名句式任务如下。前 ${requiredCount} 项标为“本篇必用”，必须每一项都实际写入正文，并分散嵌入不同场面；其余项目可选。采用“高保留换槽”：尽量保留名句约六至八成的固定词序、复沓、转折词和收束，只替换承载现代情节的主语、动作、对象、条件与结果。不可全部挤在一句中，也不可把骨架当作正文逐条抄出：
${frames}

填槽规则：
- 先从原文抽取主语、动作、对象、条件和结果，再替换骨架中的全部【槽位】；不得把槽位文字输出。
- sourceShape 必须以广为流传的《和合本》通行措辞为准；不得使用自行概括、现代转述或网络近义改写冒充经文名句。高保留改写只发生在骨架的内容槽位。
- sourceShape 中广为人知的固定句法应尽量保留，例如“我若在你眼前蒙恩，求你”“不是……乃是”“是，就说是；不是，就说不是”“凡……的，必……；凡……的，也必……”。高保留的是句序、虚词、复沓和节奏，不是死守原经句的每一个名词与谓语。
- 默认替换会成为新人物、新教义或新因果的宗教内容。若“有福、有祸、罪、审判、见证、牧者”等词与原文的褒贬、惩罚、证明或照管关系十分贴合，可保留作修辞；“神、耶和华、耶稣”只有在原文已有宗教语境，或明确只是名句引用而不会被理解为介入剧情时才可保留。
- “神说：要有……就有了……”式只适用于输入明确已经实现的结果；直接写“要有【结果】，【结果】就有了”，中间不得擅加执行者“照着去行”。
- 若没有合适的广为人知名句，也不可退回现代口语；改用和合本常见的宣告、晓谕、拒绝或威胁句法，例如“我必……”“我断不……”“你当……不可……”“论到这事……”“我必照你所说的去行”。“我弄死你”必须写成“我必夺取你的命”一类旧译表达。
- 锚点句必须承载原文的一条真实信息，不得只是装饰性重复，也不得新造因果、应许、命令、资格或结局。
- 可以调整人称、时态、肯否和句序以符合原文；输入没有三个步骤时，不得为凑排比补出第三步。`;
}

export function mandatoryCuvAnchors(text: string) {
  return selectCuvAnchors(text).slice(
    0,
    requiredFamousAnchorStyleScore(text),
  );
}

export function missingMandatoryCuvAnchors(text: string, output: string) {
  return mandatoryCuvAnchors(text).filter(
    (anchor) => anchor.outputPattern && !anchor.outputPattern.test(output),
  );
}

export const CUV_ANCHOR_STYLE_PATTERNS = [
  /我若在.{0,16}眼前蒙恩.{0,30}(?:求|请)/u,
  /我是什么.{0,12}竟能.{0,24}呢/u,
  /我(?:认识|知道).{1,30}我也(?:认识|知道).{1,30}你却是谁/u,
  /我岂是.{0,24}(?:看守|看管|照管|负责).{0,16}的吗/u,
  /你(?:凭|带着|拿着).{0,24}(?:我却|我便|我也)/u,
  /(?:你|[^，。；]{1,12})有.{1,24}[；，](?:我|[^，。；]{1,12})(?:也)?有/u,
  /不是.{1,48}乃是/u,
  /是.{0,8}就说是.{0,12}不是.{0,8}就说不是/u,
  /(?:从前|先前|本来).{1,48}(?:如今|现今|现在|反倒|却)/u,
  /凡.{1,36}(?:必|都|也|不可)/u,
  /凡(?:是)?.{1,20}的.{0,6}必.{1,20}[；，].{0,8}凡(?:是)?.{1,20}的.{0,8}(?:也)?必/u,
  /若.{1,48}(?:就|便|必|不得|不能)/u,
  /心里所充满的.{0,12}口里就说出来/u,
  /所种的是什么.{0,12}收的也是什么/u,
  /不可叫人小看.{0,16}年轻/u,
  /用什么量器.{0,20}也必用什么量器/u,
  /在后的.{0,12}(?:在前|要在前).{0,20}在前的.{0,12}(?:在后|要在后)/u,
  /[^，。；]{1,24}生[^，。；]{1,24}[；，][^。]{0,18}生/u,
  /彼此.{0,24}(?:好叫|使|叫).{1,30}(?:得|成|显)/u,
  /(?:有|到了).{0,20}(?:定期|定时|时候|时辰).{0,30}(?:也有|又有|便|就)/u,
  /(?:看哪|不料).{1,40}/u,
  /事就这样成了/u,
] as const;

export function famousAnchorStyleScore(value: string) {
  const expandedPatterns = CUV_EXPANDED_ANCHORS.flatMap((anchor) =>
    anchor.outputPattern ? [anchor.outputPattern] : [],
  );
  const storyPatterns = CUV_STORY_ANCHORS.flatMap((anchor) =>
    anchor.outputPattern ? [anchor.outputPattern] : [],
  );
  return [...CUV_ANCHOR_STYLE_PATTERNS, ...expandedPatterns, ...storyPatterns].reduce(
    (score, pattern) => score + Number(pattern.test(value)),
    0,
  );
}

export function requiredFamousAnchorStyleScore(source: string) {
  if (source.length < 60) return 1;
  if (source.length < 160) return 2;
  if (source.length < 320) return 3;
  if (source.length < 600) return 5;
  if (source.length < 1000) return 8;
  return 10;
}
