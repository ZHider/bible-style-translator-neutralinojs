---
name: speak-scripture
description: Convert modern Chinese into conspicuous Chinese Union Version style by identifying facts and speech functions, then filling fixed high-retention sentence skeletons.
---

# Speak Scripture

Use deterministic skeleton filling. The goal is a coherent Chinese Union Version-style little story, not a line-by-line transcript with archaic substitutions. Do not ask the model to freely rewrite or polish the final prose.

## Workflow

1. Reorganize the input around its story spine, then identify only:
   - text type;
   - people, sides, speaker and addressee;
   - ordered actions, objects, places, conditions, negation and results;
   - the function of each plot-changing utterance.
2. Map each speech function to one fixed Chinese Union Version skeleton.
3. Fill only the source elements into that skeleton.
4. Connect events with fixed translated-vernacular narration.
5. Return the complete result. If identification fails, use a local emergency frame; do not loop through repeated rewrites.

The identification result must be strict structured data, never draft prose. Merge greetings, repeated courtesy, seating, drinking, repeated forms of address, and nearby utterances with the same purpose. It may reorder incidental staging into a clear opening, development, turn, and ending. Preserve people, sides, central conflict, decisive action ownership, harmed parties, and outcome; exact dialogue order and minor details are subordinate to the scripture-story effect. It may label functions such as welcome, introduction, request, refusal, promise, command, warning, insult challenge, paired dominance, self-identification, self-defense, mediation, coercion, guarantee, trade price, curse or death threat. The renderer, not the identifying model, owns the final wording.

Slots contain only content that is absent from the fixed frame. Never put frame words such as 若、必、不可、你今日、我当怎样 or a copied half-sentence into a slot. For example, an exit condition is `这样离开房间`, not `你今日若这样离开房间`; a boast action is `这样对我说话`, not `我长到这么大还没有人敢这样说话`. If one source utterance has two independent functions, emit two consecutive speech units and let the renderer merge their speech tag.

## Fixed-frame principle

Every direct quotation must carry a complete recognizable frame. A few particles such as 若、必、不可、今日、乃 or 便 do not count.

Speech tags must follow continuous-dialogue context rather than repeat a full relation before every quotation:

- Use `甲对乙说` when a scene first establishes the addressee or when the addressee changes.
- In alternating dialogue, shorten to `甲回答说`, `乙说`, or the matching question/command tag.
- Merge consecutive statements by the same speaker under one quotation tag when their delivery remains compatible.
- If narration already names the actor and immediately leads into speech, attach `，说：`, `，回答说：`, or `，大声说：` to that action.
- Reserve `开口说` for a marked beginning after silence or a solemn public teaching; never use it as the default translation of `said`.

Examples:

- Request: `我若在你眼前蒙恩，求你【action】，好叫【result】得以成就。`
- Correction: `这不是【rejected】，乃是【asserted】。`
- Mutual claims: `你有【theirs】，我也有【mine】。`
- General rule: `凡【category】的，必【result】。`
- Paired rule: `凡【A】的，必【result A】；凡【B】的，也必【result B】。`
- Identity: `论到我的名，人所称呼我的名乃是【name】。`
- Challenge: `【known A】我认识，【known B】我也知道；你却是谁，竟敢【challenge】呢？`
- Refusal: `论到【matter】，我断不【action】。`
- Command: `你当【action】；不可【prohibition】。`
- Promise: `我必照你所说的【action】。`
- Mortal threat: `我必夺取【target】的命。`
- Warning: `凡自高的，必降为卑；你不可【warning】。`
- Youthful defiance: `不可叫人小看【person】年轻；我若不【quality】，还算什么年轻人呢？`
- Guarantee: `我今日在众人面前作保：若【condition】，我必【penalty】。`
- Trade: `论到【item】，每【unit】作价【price】；你若交付，我便交在你手中。`
- Curse and penalty: `若【condition】，【subject】就有祸了；它必【penalty】。`

If no narrow function fits, use a fixed general request, refusal, command, promise, question, contrast, rule, agreement or disagreement frame. Never fall back to ordinary modern dialogue inside quotation marks.

Close a complete passage with one supported final cadence. Use `这事就这样成了` only for an accomplished result, `这事的结局，就是这样` for an explicit departure or resolved conflict, and `所吩咐的话／所要晓谕的，就是这些` for commands or notices. Do not add a completion ending to a threat, question, plan, deadline, or unfinished event.

## Narrative frames

Use compact fixed narration:

- Arrival: `那时，【actor】来到【place】。`
- Action: `【actor】就【complete action phrase】。`
- Reaction: `【actor】听见这话，就转向【target】，【reaction】。`
- Indirect speech: `【actor】就向【target】陈明【matter】。`
- Transition: `及至【matter】，【actor】就【action】。`
- Outcome: `于是【actor】【action】；【result】。`

An action slot is a short complete predicate without its subject, for example `从手中取出礼物，摆在众人面前`. Do not split one source action into an invented command plus execution.

Recast common scene elements deterministically:

- 示意 → 转眼看／以目吩咐
- 放在桌上 → 摆在席前／陈在众人面前
- 桌上、酒桌前 → 席前、筵席之间
- 雅间、包间 → 摆设筵席的屋里
- 坐下、站起来 → 坐席、从席上起来
- 拿出、递给 → 从手中取出、交在某人手中
- 走进、离开 → 进了那屋、起身往所要去的地方去

## Preservation rules

Preserve the story or information spine:

- people, sides and relationships;
- speaker and addressee;
- names, brands, modern objects, numbers, currency, units, dates and times;
- conditions, negation and uncertainty;
- action ownership, harmed party, order, outcome and conclusion.

Do not invent Bible characters, miracles, doctrine, motives, extra attacks, consequences or endings. Do not turn injury into death, a request into a command, a possibility into certainty, or a future notice into a completed event.

The style is old translated vernacular, not generic classical Chinese or wuxia prose. Avoid 曰、吾、汝、矣、焉、拍案而起、说时迟那时快、只见 and similar chaptered-novel language.

Output only the rewritten body.
