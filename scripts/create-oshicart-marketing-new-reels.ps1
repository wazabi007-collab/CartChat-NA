param(
    [ValidateSet('Daniel', 'Female')]
    [string]$VoiceVariant = 'Daniel'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sourceDir = Join-Path $projectRoot 'marketing-shots\GENERATED\Marketing New'
$brandDir = Join-Path $projectRoot 'brand'
$outputRoot = Join-Path $PSScriptRoot '..\output\playwright\oshicart-marketing-new-reels'
$isFemale = $VoiceVariant -eq 'Female'
$voiceDir = Join-Path $outputRoot $(if ($isFemale) { 'voiceovers-south-african-female' } else { 'voiceovers-daniel' })
$finalDir = Join-Path $outputRoot $(if ($isFemale) { 'final-with-south-african-female-voice' } else { 'final-with-daniel-voice' })
$audioSuffix = if ($isFemale) { 'female' } else { 'daniel' }
$videoSuffix = if ($isFemale) { '-female' } else { '' }
$ffmpeg = 'C:\tmp\oshicart-video-tools\node_modules\ffmpeg-static\ffmpeg.exe'
$logo = Join-Path $brandDir 'logo-horizontal-dark-2x.png'

New-Item -ItemType Directory -Force -Path $finalDir | Out-Null

$reels = @(
    @{
        File = "01-dm-chaos-to-pocket-store$videoSuffix-final.mp4"
        Image1 = 'C1- before and After.png'
        Image2 = 'Oshicart Batch A (3) - Your Whole shop in your pocket.png'
        Audio = "01-dm-chaos-to-pocket-store-$audioSuffix.mp3"
        Line1 = 'FROM DMS TO A REAL STORE'
        Line2 = 'SELL SMARTER WITH OSHICART'
    },
    @{
        File = "02-orders-and-whatsapp-updates$videoSuffix-final.mp4"
        Image1 = 'A2 orders come in while you work.png'
        Image2 = 'B1 - Whatsapp auto Replies.png'
        Audio = "02-orders-and-whatsapp-updates-$audioSuffix.mp3"
        Line1 = 'WORK. SELL. STAY UPDATED.'
        Line2 = 'ORDERS KEEP MOVING'
    },
    @{
        File = "03-variations-and-coupons$videoSuffix-final.mp4"
        Image1 = 'B2 - Variations.png'
        Image2 = 'B4 - Coupons.png'
        Audio = "03-variations-and-coupons-$audioSuffix.mp3"
        Line1 = 'MORE CHOICE. MORE SALES.'
        Line2 = 'VARIATIONS + COUPONS'
    },
    @{
        File = "04-analytics-and-dashboard$videoSuffix-final.mp4"
        Image1 = 'B3- Analytics.png'
        Image2 = 'B 6 everything in one place.png'
        Audio = "04-analytics-and-dashboard-$audioSuffix.mp3"
        Line1 = 'KNOW WHAT ACTUALLY SELLS'
        Line2 = 'GROW WITH BETTER INSIGHTS'
    },
    @{
        File = "05-local-sellers$videoSuffix-final.mp4"
        Image1 = 'A1 Boutiques  + Invoice.png'
        Image2 = 'A4 From the grill to online.png'
        Audio = "05-local-sellers-$audioSuffix.mp3"
        Line1 = 'BUILT FOR LOCAL SELLERS'
        Line2 = 'BOUTIQUES. FOOD. AND MORE.'
    }
)

$imageFilter = "split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=32:12,eq=brightness=-0.30:saturation=0.85[blur];[fg]scale=1010:1750:force_original_aspect_ratio=decrease[card];[blur][card]overlay=(W-w)/2:(H-h)/2,zoompan=z='min(zoom+0.00045,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=155:s=1080x1920:fps=25,format=yuv420p"

foreach ($reel in $reels) {
    $image1 = Join-Path $sourceDir $reel.Image1
    $image2 = Join-Path $sourceDir $reel.Image2
    $audio = Join-Path $voiceDir $reel.Audio
    $output = Join-Path $finalDir $reel.File

    foreach ($required in @($image1, $image2, $audio, $logo, $ffmpeg)) {
        if (-not (Test-Path -LiteralPath $required)) {
            throw "Missing required file: $required"
        }
    }

    $filter = @"
[0:v]$imageFilter[v0];
[1:v]$imageFilter[v1];
[2:v]format=yuv420p[endbg];
[3:v]scale=690:-1[logo];
[endbg][logo]overlay=(W-w)/2:300,
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($reel.Line1)':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=835,
drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='$($reel.Line2)':fontcolor=0xB8C2D1:fontsize=32:x=(w-text_w)/2:y=930,
drawbox=x=190:y=1195:w=700:h=112:color=0x159947:t=fill,
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='START FREE AT OSHICART.COM':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=1230,
drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='Your business. One simple store.':fontcolor=0xF2B705:fontsize=28:x=(w-text_w)/2:y=1435[end];
[v0][v1]xfade=transition=fade:duration=0.25:offset=5.95[v01];
[v01][end]xfade=transition=fade:duration=0.25:offset=11.90[v];
[4:a]loudnorm=I=-14:TP=-3:LRA=7,adelay=250:all=1,apad,atrim=duration=15,afade=t=out:st=14.45:d=0.55[a]
"@ -replace "`r?`n", ''

    $arguments = @(
        '-y',
        '-loop', '1', '-t', '6.2', '-i', $image1,
        '-loop', '1', '-t', '6.2', '-i', $image2,
        '-f', 'lavfi', '-t', '3.1', '-i', 'color=c=0x0B1220:s=1080x1920:r=25',
        '-loop', '1', '-t', '3.1', '-i', $logo,
        '-i', $audio,
        '-filter_complex', $filter,
        '-map', '[v]', '-map', '[a]',
        '-t', '15', '-r', '25',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-movflags', '+faststart',
        $output
    )

    Write-Host "Creating $($reel.File)..."
    & $ffmpeg @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed while creating $($reel.File)"
    }
}

Write-Host "Created $($reels.Count) reels in $finalDir"
