function New-RebuildBlog{
  <#
    .SYNOPSIS
        Builds all website pages

    .DESCRIPTION
        This function builds for fist the index.md page, after, builds all *.md files inside the articles page

    .OUTPUTS
        All generated html files

    .EXAMPLE
        New-Article
    #>

	# Builds index.html
	pandoc ..\index.md -s -f gfm -t html5 --template=..\template\index.html --defaults=..\defaults\params_index.yaml --output ..\index.html

	# Gets all *.md files inside the articles folder
	$md_files = Get-ChildItem ..\articles\ | Where-Object {$_.Extension -eq ".md"}
	# Iterates over the *.md file list
	$md_files | ForEach-Object{
		# Using pandoc, generates the html files
		pandoc ..\articles\$_ -f markdown -t html --template=..\template\article.html --defaults=..\defaults\params_$($_.BaseName).yaml --output ..\articles\$($_.BaseName).html
	}
}

New-RebuildBlog