$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'docs\blog'
$outputDir = Join-Path $repoRoot 'public\blog\posts'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

$posts = @(
  [PSCustomObject]@{
    Source = '24.6.1说说.docx'
    Slug = 'gaokao-five-days'
    Title = '高考前五天'
    Date = '2024-06-01'
    Tags = @('说说', '高考', '随笔')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '24.6.27说说.docx'
    Slug = 'xian-three-day-trip'
    Title = '西安三日游'
    Date = '2024-06-27'
    Tags = @('说说', '旅行', '西安')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '24.11.21说说.docx'
    Slug = 'after-watching-shirobako'
    Title = '看完《白箱》有感'
    Date = '2024-11-21'
    Tags = @('说说', '动漫', '随笔')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '25.1.27说说.docx'
    Slug = 'spring-festival-wishes-2025'
    Title = '春节快乐'
    Date = '2025-01-27'
    Tags = @('说说', '新年', '祝福')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '25.5.13说说.docx'
    Slug = 'you-are-just-a-cat'
    Title = '你只是一个小猫咪'
    Date = '2025-05-13'
    Tags = @('说说', '校园', '小猫')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '25.11.11文章——小小的床和小小的我.docx'
    Slug = 'bed-and-me'
    Title = '小小的床和小小的我'
    Date = '2025-11-11'
    Tags = @('文章', '感悟', '床')
    SkipFirst = 1
  },
  [PSCustomObject]@{
    Source = '25.11.16说说.docx'
    Slug = 'meaning-of-travel'
    Title = '旅游的意义'
    Date = '2025-11-16'
    Tags = @('说说', '旅行', '朋友')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '25.11.18说说.docx'
    Slug = 'wuhan-university-death-stranding'
    Title = '在武大办事像《死亡搁浅》'
    Date = '2025-11-18'
    Tags = @('说说', '校园', '日常')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '25.12.19说说.docx'
    Slug = 'what-university-life-should-be'
    Title = '大学生活应该是什么样的'
    Date = '2025-12-19'
    Tags = @('说说', '大学', '生活')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.1.1说说.docx'
    Slug = '2025-wrap'
    Title = '《2025》正式杀青'
    Date = '2026-01-01'
    Tags = @('说说', '年度总结', '新年')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.1.30说说.docx'
    Slug = 'cosmic-princess-kaguya-review'
    Title = '《超时空辉夜姬》推荐与感悟'
    Date = '2026-01-30'
    Tags = @('说说', '动漫', '推荐')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.2.17过年说说.docx'
    Slug = 'new-year-2026'
    Title = '笑着面对新的一年'
    Date = '2026-02-17'
    Tags = @('说说', '新年', '朋友')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.3.27说说.docx'
    Slug = 'twentieth-birthday'
    Title = '二旬生日快乐'
    Date = '2026-03-27'
    Tags = @('说说', '生日', '二十岁')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.4.10自传（小学+一半初中）.docx'
    Slug = 'autobiography-primary-junior-high'
    Title = '自传（小学＋一半初中）'
    Date = '2026-04-10'
    Tags = @('自传', '回忆', '成长')
    SkipFirst = 1
  },
  [PSCustomObject]@{
    Source = '26.7.21说说.docx'
    Slug = 'midsummer-and-now'
    Title = '盛夏、生活与此时此刻'
    Date = '2026-07-21'
    Tags = @('说说', '夏日', '生活')
    SkipFirst = 0
  },
  [PSCustomObject]@{
    Source = '26.7.23日常的片段（一）.docx'
    Slug = 'daily-fragments-1'
    Title = '日常的片段（一）'
    Date = '2026-07-23'
    Tags = @('文章', '日常', '随笔')
    SkipFirst = 0
  }
)

function Get-DocumentParagraphs {
  param([string]$Path)

  $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $archive.GetEntry('word/document.xml')
    if (-not $entry) {
      throw "Word document XML not found: $Path"
    }

    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    try {
      [xml]$document = $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
      $stream.Dispose()
    }

    $namespaceManager = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
    $namespaceManager.AddNamespace('w', $wordNamespace)
    $result = @()

    foreach ($paragraph in $document.SelectNodes('//w:body/w:p', $namespaceManager)) {
      $plainBuilder = New-Object System.Text.StringBuilder
      $htmlBuilder = New-Object System.Text.StringBuilder

      foreach ($node in $paragraph.SelectNodes('.//w:t | .//w:tab | .//w:br | .//w:cr', $namespaceManager)) {
        switch ($node.LocalName) {
          't' {
            $text = [string]$node.InnerText
            [void]$plainBuilder.Append($text)
            [void]$htmlBuilder.Append([System.Net.WebUtility]::HtmlEncode($text))
          }
          'tab' {
            [void]$plainBuilder.Append("`t")
            [void]$htmlBuilder.Append('&emsp;')
          }
          default {
            [void]$plainBuilder.Append("`n")
            [void]$htmlBuilder.Append('<br>')
          }
        }
      }

      $result += [PSCustomObject]@{
        Plain = $plainBuilder.ToString()
        Html = $htmlBuilder.ToString()
      }
    }

    return $result
  }
  finally {
    $archive.Dispose()
  }
}

function Get-Excerpt {
  param([string]$Text)

  $singleLine = [System.Text.RegularExpressions.Regex]::Replace($Text, '\s+', ' ').Trim()
  if ($singleLine.Length -le 88) {
    return $singleLine
  }

  return $singleLine.Substring(0, 88).TrimEnd(' ', '，', '。', '、', '；', '：') + '……'
}

function Get-BodyHtml {
  param([object[]]$Paragraphs)

  $headingNames = @('小学篇', '初中篇', '高中篇', '大学篇', '生活篇', '展望篇', '杂谈篇')
  $blocks = @()

  foreach ($paragraph in $Paragraphs) {
    $plain = $paragraph.Plain.Trim()
    if (-not $plain) {
      continue
    }

    if ($headingNames -contains $plain) {
      $blocks += "      <h2>$([System.Net.WebUtility]::HtmlEncode($plain))</h2>"
    }
    elseif ($plain -match '^\d{1,2}\.\d{1,2}\s+awa$') {
      $blocks += "      <p class=`"signature`">$($paragraph.Html)</p>"
    }
    elseif ($plain.StartsWith('——')) {
      $blocks += "      <blockquote>$($paragraph.Html)</blockquote>"
    }
    else {
      $blocks += "      <p>$($paragraph.Html)</p>"
    }
  }

  return $blocks -join "`n"
}

if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$index = @()

foreach ($post in $posts) {
  $sourcePath = Join-Path $sourceDir $post.Source
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing source document: $($post.Source)"
  }

  $paragraphs = @(Get-DocumentParagraphs -Path $sourcePath)
  if ($post.SkipFirst -gt 0) {
    $paragraphs = @($paragraphs | Select-Object -Skip $post.SkipFirst)
  }

  $bodyHtml = Get-BodyHtml -Paragraphs $paragraphs
  $plainText = ($paragraphs | ForEach-Object { $_.Plain }) -join ' '
  $excerpt = Get-Excerpt -Text $plainText
  $encodedTitle = [System.Net.WebUtility]::HtmlEncode($post.Title)
  $encodedExcerpt = [System.Net.WebUtility]::HtmlEncode($excerpt)
  $tagHtml = ($post.Tags | ForEach-Object {
    "        <span class=`"tag`">#$([System.Net.WebUtility]::HtmlEncode($_))</span>"
  }) -join "`n"

  $html = @"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="$encodedExcerpt">
  <meta name="author" content="awa">
  <title>$encodedTitle · awaqwq233</title>
  <link rel="stylesheet" href="/blog/posts/article.css">
</head>
<body>
  <main class="page-shell">
    <a class="back-link" href="/#/blog" aria-label="返回博客列表">← 返回博客</a>
    <article>
      <header class="article-header">
        <p class="eyebrow">LIFE NOTES</p>
        <h1>$encodedTitle</h1>
        <div class="meta">
          <time datetime="$($post.Date)">📅 $($post.Date)</time>
          <span aria-hidden="true">·</span>
          <span>🌸 生活</span>
        </div>
        <div class="tags">
$tagHtml
        </div>
      </header>
      <div class="article-body">
$bodyHtml
      </div>
    </article>
    <footer class="article-footer">
      <a href="/#/blog">浏览全部文章 →</a>
    </footer>
  </main>
</body>
</html>
"@

  $outputPath = Join-Path $outputDir "$($post.Slug).html"
  [System.IO.File]::WriteAllText($outputPath, $html, $utf8NoBom)

  $index += [PSCustomObject]@{
    title = $post.Title
    date = $post.Date
    category = 'life'
    categoryLabel = '🌸 生活'
    tags = $post.Tags
    excerpt = $excerpt
    url = "/blog/posts/$($post.Slug).html"
  }

  Write-Output ("Generated {0} from {1}" -f (Split-Path -Leaf $outputPath), $post.Source)
}

$index = @($index | Sort-Object { [datetime]$_.date } -Descending)
$jsonItems = @($index | ForEach-Object {
  $titleJson = ConvertTo-Json -Compress -InputObject $_.title
  $dateJson = ConvertTo-Json -Compress -InputObject $_.date
  $categoryJson = ConvertTo-Json -Compress -InputObject $_.category
  $categoryLabelJson = ConvertTo-Json -Compress -InputObject $_.categoryLabel
  $tagsJson = ConvertTo-Json -Compress -InputObject @($_.tags)
  $excerptJson = ConvertTo-Json -Compress -InputObject $_.excerpt
  $urlJson = ConvertTo-Json -Compress -InputObject $_.url

  @"
  {
    "title": $titleJson,
    "date": $dateJson,
    "category": $categoryJson,
    "categoryLabel": $categoryLabelJson,
    "tags": $tagsJson,
    "excerpt": $excerptJson,
    "url": $urlJson
  }
"@
})
$json = "[`n" + ($jsonItems -join ",`n") + "`n]"
[System.IO.File]::WriteAllText((Join-Path $outputDir 'index.json'), $json + "`n", $utf8NoBom)

Write-Output ("Synced {0} blog posts." -f $index.Count)
