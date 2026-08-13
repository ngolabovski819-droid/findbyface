param(
    [Parameter(Mandatory = $true)]
    [string]$Catalog,

    [ValidateRange(1, 8)]
    [int]$Shards = 4,

    [ValidateRange(1, 5)]
    [int]$MaxAttempts = 2
)

$ErrorActionPreference = 'Stop'

function Quote-PowerShellLiteral {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

$workspace = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $workspace '.venv312\Scripts\python.exe'
$indexer = Join-Path $PSScriptRoot 'index_video_faces_supabase.py'
$shardRunner = Join-Path $PSScriptRoot 'run_video_face_shard.ps1'
$catalogPath = if ([System.IO.Path]::IsPathRooted($Catalog)) {
    [System.IO.Path]::GetFullPath($Catalog)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $workspace $Catalog))
}

if (-not (Test-Path -LiteralPath $pythonExe -PathType Leaf)) {
    throw "Python environment not found: $pythonExe"
}
if (-not (Test-Path -LiteralPath $indexer -PathType Leaf)) {
    throw "Indexer not found: $indexer"
}
if (-not (Test-Path -LiteralPath $shardRunner -PathType Leaf)) {
    throw "Shard runner not found: $shardRunner"
}
if (-not (Test-Path -LiteralPath $catalogPath -PathType Leaf)) {
    throw "Catalog not found: $catalogPath"
}

$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$catalogName = [System.IO.Path]::GetFileNameWithoutExtension($catalogPath)
$logDir = Join-Path $workspace "logs\$catalogName-$runStamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$windowsTerminal = Get-Command 'wt.exe' -ErrorAction SilentlyContinue

$processes = foreach ($shard in 0..($Shards - 1)) {
    $logPath = Join-Path $logDir "shard-$shard.log"
    $title = "Video faces: $catalogName | shard $($shard + 1)/$Shards"
    $runnerArguments = @(
        '-NoLogo',
        '-NoExit',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        "`"$shardRunner`"",
        '-PythonExe',
        "`"$pythonExe`"",
        '-Indexer',
        "`"$indexer`"",
        '-Catalog',
        "`"$catalogPath`"",
        '-ShardCount',
        "$Shards",
        '-ShardIndex',
        "$shard",
        '-MaxAttempts',
        "$MaxAttempts",
        '-LogPath',
        "`"$logPath`"",
        '-WindowTitle',
        "`"$title`""
    )

    if ($windowsTerminal) {
        $terminalArguments = @(
            '-w',
            'new',
            'new-tab',
            '--title',
            "`"$title`"",
            'powershell.exe'
        ) + $runnerArguments
        $process = Start-Process `
            -FilePath $windowsTerminal.Source `
            -ArgumentList $terminalArguments `
            -WorkingDirectory $workspace `
            -PassThru
    } else {
        $process = Start-Process `
            -FilePath 'powershell.exe' `
            -ArgumentList $runnerArguments `
            -WorkingDirectory $workspace `
            -WindowStyle Normal `
            -PassThru
    }

    [pscustomobject]@{
        Shard = $shard
        ProcessId = $process.Id
        Log = $logPath
    }
}

Write-Host "Started $Shards visible progress terminals."
Write-Host "Logs: $logDir"
$processes | Format-Table -AutoSize
