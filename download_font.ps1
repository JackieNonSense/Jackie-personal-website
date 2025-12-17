$dir = "public/fonts"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir }
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json" -OutFile "$dir/helvetiker_regular.typeface.json"
