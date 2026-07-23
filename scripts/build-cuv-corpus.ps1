param(
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot "references\cuv-corpus"
$fullOutput = Join-Path $outputRoot "cuv-full-verses.json"
$candidateOutput = Join-Path $outputRoot "cuv-usable-candidates.json"
$statsOutput = Join-Path $outputRoot "cuv-extraction-stats.json"
$sourceUrl = "https://ebible.org/Scriptures/cmn-cu89s_usfm.zip"
$detailsUrl = "https://ebible.org/Scriptures/details.php?id=cmn-cu89s"

if ((Test-Path $fullOutput) -and (Test-Path $candidateOutput) -and -not $Refresh) {
  Write-Output "CUV corpus already exists. Use -Refresh to rebuild it."
  exit 0
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cuv-corpus-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $workRoot "cmn-cu89s_usfm.zip"
$usfmRoot = Join-Path $workRoot "usfm"
New-Item -ItemType Directory -Path $workRoot, $usfmRoot -Force | Out-Null

Write-Output "Downloading the public-domain Chinese Union Version corpus..."
Invoke-WebRequest -Uri $sourceUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 120
Expand-Archive -LiteralPath $zipPath -DestinationPath $usfmRoot

function Clean-UsfmText([string]$value) {
  if (-not $value) { return "" }
  $cleaned = $value
  $cleaned = [regex]::Replace($cleaned, '\\f\s.*?\\f\*', '')
  $cleaned = [regex]::Replace($cleaned, '\\x\s.*?\\x\*', '')
  $cleaned = [regex]::Replace($cleaned, '\\fig\s.*?\\fig\*', '')
  $cleaned = [regex]::Replace($cleaned, '\\(?:add|wj|nd|pn|qt|k|dc)\s*', '')
  $cleaned = [regex]::Replace($cleaned, '\\(?:add|wj|nd|pn|qt|k|dc)\*', '')
  $cleaned = [regex]::Replace($cleaned, '\\[a-z][a-z0-9-]*\*?\s*', '')
  $cleaned = $cleaned -replace [char]0x3000, ' '
  $cleaned = [regex]::Replace($cleaned, '\s+', ' ').Trim()
  return $cleaned
}

$aphorismThemePatterns = [ordered]@{
  "谦卑与骄傲" = '骄傲|自高|自大|谦卑|降为卑|升为高'
  "撒种与收取" = '撒种|收割|果效|报应|所种的|收的也'
  "量器与待人" = '量器|怎样待|论断人|怜恤人'
  "树木与果子" = '好树|坏树|果子|树好|树坏'
  "内心与言语" = '心里所充满|口里|舌头|言语|嘴唇'
  "柔和与怒气" = '回答柔和|怒气|发怒|暴戾|温良'
  "殷勤与懒惰" = '殷勤|懒惰|手勤|手懒|劳碌|作工'
  "时候与定期" = '定期|定时|时候|日子|明日|爱惜光阴'
  "忍耐与盼望" = '忍耐|等候|盼望|患难|试炼|跌倒.*兴起'
  "智慧与愚昧" = '智慧|聪明|愚昧|愚妄|知识|训诲'
  "谋略与商议" = '谋略|商议|谋士|筹算|劝教'
  "诚实与虚假" = '诚实|谎言|说谎|真理|隐藏的事|显明'
  "公平与正直" = '公平|公义|正直|天平|法码|审判'
  "怜悯与恩慈" = '怜悯|怜恤|恩慈|施舍|滋润人'
  "饶恕与宽恕" = '饶恕|赦免|遮掩.*过错|以善胜恶'
  "和睦与纷争" = '和睦|纷争|争竞|争闹|止息'
  "朋友与同伴" = '朋友|弟兄|同伴|二人|铁磨铁'
  "施予与知足" = '施比受|施舍|捐得|知足|财宝|银子'
  "忠心与责任" = '忠心|管家|托付|担当|责任'
  "小事与根基" = '小事|芥菜种|面酵|磐石|根基|建造'
  "道路与选择" = '道路|善道|窄门|正路|指引.*路'
  "寻找与祈求" = '寻找|寻见|祈求|叩门|搜求'
  "光明与黑暗" = '光明|黑暗|灯台|灯|显明'
  "节制与警醒" = '节制|谨守|警醒|谨慎|制伏.*心'
  "爱与包容" = '恒久忍耐.*恩慈|爱能遮掩|凡事包容|彼此相爱'
  "得失与轻重" = '有什么益处|胜过|不如|赔上|舍下|得着'
}

$aphorismSignal = [regex]'有福|有祸|凡.{0,28}(?:必|就|不可)|若.{0,36}(?:就|必|便)|不要|不可|应当|当要|总要|务要|宁可|胜过|不如|因为|所以|乃是|就是|好像|如同|何等|岂不|必不|必得|必要|终久|至终'
$dialogueSignal = [regex]'(?:说|回答|问|吩咐|喊叫|劝|告诉).{0,12}[：「『“]|[：「『“].{1,80}[」』”]'
$storySignal = [regex]'那时|于是|次日|第二天|过了些日子|这事以后|到了|及至|当下|后来|起来|来到|进去|出去|离开|看见|听见|众人|有一个|有一人|就把|便把|带着|跟随|逃跑|追赶|捉拿|摆设筵席'

$verses = [System.Collections.Generic.List[object]]::new()
$bookNames = [System.Collections.Generic.HashSet[string]]::new()

foreach ($file in Get-ChildItem $usfmRoot -Filter '*.usfm' -File | Sort-Object Name) {
  $bookId = ""
  $bookName = ""
  $chapter = 0
  $currentVerse = $null
  $currentText = [System.Text.StringBuilder]::new()

  foreach ($line in Get-Content -LiteralPath $file.FullName -Encoding utf8) {
    if ($line -match '^\\id\s+([^\s]+)') {
      $bookId = $Matches[1]
      continue
    }
    if ($line -match '^\\h\s+(.+)$') {
      $bookName = (Clean-UsfmText $Matches[1])
      [void]$bookNames.Add($bookName)
      continue
    }
    if ($line -match '^\\c\s+(\d+)') {
      $chapter = [int]$Matches[1]
      continue
    }
    if ($line -match '^\\v\s+([^\s]+)\s*(.*)$') {
      if ($null -ne $currentVerse) {
        $text = Clean-UsfmText $currentText.ToString()
        if ($text) {
          $verses.Add([pscustomobject]@{
            book = $bookName
            bookId = $bookId
            chapter = $currentVerse.chapter
            verse = $currentVerse.verse
            reference = "$bookName $($currentVerse.chapter):$($currentVerse.verse)"
            text = $text
          })
        }
      }
      $currentVerse = [pscustomobject]@{ chapter = $chapter; verse = $Matches[1] }
      $currentText = [System.Text.StringBuilder]::new()
      [void]$currentText.Append($Matches[2])
      continue
    }
    if ($null -eq $currentVerse) { continue }
    if ($line -match '^\\(?:s\d*|r|d|sp|qa|ms\d*|mr|cl|cd|periph|toc\d|mt\d*)\b') { continue }
    $continuation = Clean-UsfmText $line
    if ($continuation) {
      [void]$currentText.Append(' ')
      [void]$currentText.Append($continuation)
    }
  }

  if ($null -ne $currentVerse) {
    $text = Clean-UsfmText $currentText.ToString()
    if ($text) {
      $verses.Add([pscustomobject]@{
        book = $bookName
        bookId = $bookId
        chapter = $currentVerse.chapter
        verse = $currentVerse.verse
        reference = "$bookName $($currentVerse.chapter):$($currentVerse.verse)"
        text = $text
      })
    }
  }
}

$candidates = [System.Collections.Generic.List[object]]::new()
$typeCounts = [ordered]@{ aphorism = 0; dialogue = 0; story = 0 }
$themeCounts = [ordered]@{}
foreach ($name in $aphorismThemePatterns.Keys) { $themeCounts[$name] = 0 }

foreach ($verse in $verses) {
  $types = [System.Collections.Generic.List[string]]::new()
  $themes = [System.Collections.Generic.List[string]]::new()
  $text = [string]$verse.text
  $isAphorism = $text.Length -le 180 -and $aphorismSignal.IsMatch($text)
  $isDialogue = $dialogueSignal.IsMatch($text)
  $isStory = $storySignal.IsMatch($text)

  if ($isAphorism) {
    $types.Add('aphorism')
    $typeCounts.aphorism++
    foreach ($entry in $aphorismThemePatterns.GetEnumerator()) {
      if ($text -match $entry.Value) {
        $themes.Add($entry.Key)
        $themeCounts[$entry.Key]++
      }
    }
    if ($themes.Count -eq 0) { $themes.Add('通用格言') }
  }
  if ($isDialogue) { $types.Add('dialogue'); $typeCounts.dialogue++ }
  if ($isStory) { $types.Add('story'); $typeCounts.story++ }

  if ($types.Count -gt 0) {
    $candidates.Add([pscustomobject]@{
      reference = $verse.reference
      book = $verse.book
      chapter = $verse.chapter
      verse = $verse.verse
      types = @($types)
      themes = @($themes)
      text = $text
    })
  }
}

$metadata = [ordered]@{
  title = "新标点和合本（简体）"
  abbreviation = "CUVs"
  source = $sourceUrl
  details = $detailsUrl
  rights = "Public Domain"
  generatedAt = [DateTime]::UtcNow.ToString('o')
}

$fullCorpus = [ordered]@{
  metadata = $metadata
  bookCount = $bookNames.Count
  verseCount = $verses.Count
  verses = @($verses)
}
$candidateCorpus = [ordered]@{
  metadata = $metadata
  scannedVerseCount = $verses.Count
  candidateCount = $candidates.Count
  candidates = @($candidates)
}
$stats = [ordered]@{
  metadata = $metadata
  bookCount = $bookNames.Count
  verseCount = $verses.Count
  candidateCount = $candidates.Count
  typeCounts = $typeCounts
  aphorismThemeCounts = $themeCounts
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($fullOutput, ($fullCorpus | ConvertTo-Json -Depth 8 -Compress), $utf8NoBom)
[System.IO.File]::WriteAllText($candidateOutput, ($candidateCorpus | ConvertTo-Json -Depth 8 -Compress), $utf8NoBom)
[System.IO.File]::WriteAllText($statsOutput, ($stats | ConvertTo-Json -Depth 8), $utf8NoBom)

Write-Output "Scanned $($verses.Count) verses from $($bookNames.Count) books."
Write-Output "Extracted $($candidates.Count) usable aphorism/dialogue/story candidates."
Write-Output "Wrote $fullOutput"
Write-Output "Wrote $candidateOutput"
