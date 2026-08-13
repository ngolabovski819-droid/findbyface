param(
    [Parameter(Mandatory = $true)]
    [string]$PythonExe,

    [Parameter(Mandatory = $true)]
    [string]$Indexer,

    [Parameter(Mandatory = $true)]
    [string]$Catalog,

    [Parameter(Mandatory = $true)]
    [int]$ShardCount,

    [Parameter(Mandatory = $true)]
    [int]$ShardIndex,

    [Parameter(Mandatory = $true)]
    [int]$MaxAttempts,

    [Parameter(Mandatory = $true)]
    [string]$LogPath,

    [Parameter(Mandatory = $true)]
    [string]$WindowTitle
)

$Host.UI.RawUI.WindowTitle = $WindowTitle
$workspace = Split-Path -Parent (Split-Path -Parent $Indexer)
Set-Location -LiteralPath $workspace

Write-Host "$WindowTitle" -ForegroundColor Cyan
Write-Host "Progress log: $LogPath"
Write-Host ''

& $PythonExe `
    $Indexer `
    $Catalog `
    --shard-count $ShardCount `
    --shard-index $ShardIndex `
    --max-attempts $MaxAttempts 2>&1 |
    Tee-Object -FilePath $LogPath

$exitCode = $LASTEXITCODE
Write-Host ''
if ($exitCode -eq 0) {
    Write-Host 'Shard finished successfully. This window will remain open.' -ForegroundColor Green
} else {
    Write-Host "Shard stopped with exit code $exitCode. Review the log above." -ForegroundColor Red
}

