# Builds index.html
pandoc ..\index.md -s -f gfm -t html5 --template=..\template\index.html --defaults=..\defaults\params_index.yaml --output ..\index.html

$md_files = Get-ChildItem ..\articles\ | Where-Object {$_.Extension -eq ".md"}
$md_files | ForEach-Object{
	pandoc ..\articles\$_ -s -f gfm -t html5 --template=..\template\article.html --defaults=..\defaults\params_$($_.BaseName).yaml --output ..\articles\$($_.BaseName).html
}