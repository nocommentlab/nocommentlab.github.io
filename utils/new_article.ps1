$article_title = "Articolo di test"
$article_params_template = @"
---
metadata:
  title: $article_title
  author:
  - Antonio Blescia
  title-prefix: "!// Lab: "
  page:
    resources:
      css:
        - "../css/index.css"
        - "../css/article.css"
      js:
        - "../js/dynamics.js"
        - "../js/tinycolor.js"
        - "../js/mv.es5.js"
    contents:
      contacts:
        name: NoCommentLab
        shortdescription: Cyber Security & Software Development
        twitter: '#'
        email: a.blescia@nocommentlab.it
"@

# Generates the new article UUID
$uuid_article = [guid]::NewGuid().Guid
# Creates the params article file
$article_params_template | Out-File ..\defaults\params_$uuid_article.yaml
# Creates the article and append the title
"# $($article_title)" | Out-File ..\articles\$uuid_article.md