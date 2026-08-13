$envFile = Join-Path $PSScriptRoot '..\.env'
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
        Set-Item -Path "env:$($Matches[1])" -Value $Matches[2]
    }
}
$url = $env:SUPABASE_URL.TrimEnd('/')
$key = $env:SUPABASE_KEY

Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient

function CountQ($q) {
    $req = New-Object System.Net.Http.HttpRequestMessage('GET', "$url/rest/v1/onlyfans_profiles?$q&limit=1")
    $req.Headers.Add('apikey', $key)
    $req.Headers.Add('Authorization', "Bearer $key")
    $req.Headers.Add('Prefer', 'count=exact')
    $resp = $client.SendAsync($req).Result
    $cr = $resp.Content.Headers.GetValues('Content-Range')[0]
    return ($cr -split '/')[-1]
}

"total                       : " + (CountQ 'select=id')
"has avatar                  : " + (CountQ 'select=id&avatar=not.is.null')
"metrics done (any version)  : " + (CountQ 'select=id&face_metrics_version=not.is.null')
"metrics at v16              : " + (CountQ 'select=id&face_metrics_version=eq.16')
"metrics < v16               : " + (CountQ 'select=id&face_metrics_version=lt.16')
"NEED metrics (avatar, <v16) : " + (CountQ 'select=id&avatar=not.is.null&or=(face_metrics_version.is.null,face_metrics_version.lt.16)')
"NEED embedding (avatar,null): " + (CountQ 'select=id&avatar=not.is.null&face_embedding=is.null')
