$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$cartRoot = Split-Path -Parent $repo
$workspace = Split-Path -Parent $cartRoot
$reels = Join-Path $repo 'output\playwright\oshicart-reels'
$promo = Join-Path $repo 'output\playwright\oshicart-promo-variety'
$segments = Join-Path $promo 'segments'
$ffmpeg = 'C:\tmp\oshicart-video-tools\node_modules\ffmpeg-static\ffmpeg.exe'
$font = 'C\:/Windows/Fonts/arialbd.ttf'
$logo = Join-Path $cartRoot 'brand\logo-horizontal-2x.png'
$logoDark = Join-Path $cartRoot 'brand\logo-horizontal-dark-2x.png'
$fashion = Join-Path $workspace 'OshiCart_Short_Form_Video_Drop_Folder\03_MARKETING_IMAGES\A1 Boutiques  + Invoice.png'
$beauty = Join-Path $workspace 'OshiCart_AI_Marketing_Kit\assets\live-page-references\current-homepage-hero-industries.webp'
$cakes = Join-Path $workspace 'marketing-captures\bakery-assets\cinnamon-rolls.jpg'
$digital = Join-Path $cartRoot 'marketing-shots\GENERATED\Oshicart C (2).png'
$voice = Join-Path $promo 'oshicart-variety-promo-voiceover-female.mp3'

New-Item -ItemType Directory -Force -Path $promo, $segments | Out-Null

function Run-Ffmpeg {
    param([string[]]$Arguments)
    & $ffmpeg @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed with exit code $LASTEXITCODE"
    }
}

$common = @('-hide_banner', '-loglevel', 'error', '-y')
$encode = @('-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '25')

# 0-3.8s — premium branded opener
Run-Ffmpeg ($common + @(
    '-f', 'lavfi', '-i', 'color=c=0xF8FAFC:s=1080x1920:r=25:d=3.8',
    '-loop', '1', '-i', $logo,
    '-filter_complex', "[1:v]scale=700:-1[logo];[0:v][logo]overlay=(W-w)/2:310,drawbox=x=90:y=720:w=900:h=4:color=0x159947:t=fill,drawtext=fontfile='$font':text='WHAT DO YOU SELL?':fontcolor=0x0B1220:fontsize=82:x=(w-text_w)/2:y=825,drawtext=fontfile='$font':text='Fashion. Beauty. Food. Digital.':fontcolor=0x2B5EA7:fontsize=44:x=(w-text_w)/2:y=960,drawbox=x=210:y=1110:w=660:h=110:color=0xF2B705:t=fill,drawtext=fontfile='$font':text='OshiCart caters for you.':fontcolor=0x0B1220:fontsize=40:x=(w-text_w)/2:y=1145",
    '-t', '3.8'
) + $encode + @((Join-Path $segments '00-opener.mp4')))

# 3.6-7.2s — boutique / fashion
Run-Ffmpeg ($common + @(
    '-loop', '1', '-t', '3.6', '-i', $fashion,
    '-vf', "crop=580:1028:540:380,scale=1080:1920,zoompan=z='min(zoom+0.0006,1.05)':d=90:s=1080x1920:fps=25,drawbox=x=55:y=1435:w=970:h=250:color=0x0B1220@0.90:t=fill,drawtext=fontfile='$font':text='FASHION & BOUTIQUES':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=1500,drawtext=fontfile='$font':text='Turn your collection into a real store.':fontcolor=0xF2B705:fontsize=35:x=(w-text_w)/2:y=1598",
    '-t', '3.6'
) + $encode + @((Join-Path $segments '01-fashion.mp4')))

# 7.0-10.6s — perfumes / beauty
Run-Ffmpeg ($common + @(
    '-loop', '1', '-t', '3.6', '-i', $beauty,
    '-vf', "crop=608:1080:1312:0,scale=1080:1920,zoompan=z='min(zoom+0.0005,1.04)':d=90:s=1080x1920:fps=25,drawbox=x=55:y=1435:w=970:h=250:color=0x0B1220@0.90:t=fill,drawtext=fontfile='$font':text='PERFUMES & BEAUTY':fontcolor=white:fontsize=63:x=(w-text_w)/2:y=1500,drawtext=fontfile='$font':text='Show every product beautifully.':fontcolor=0xF2B705:fontsize=38:x=(w-text_w)/2:y=1598",
    '-t', '3.6'
) + $encode + @((Join-Path $segments '02-beauty.mp4')))

# 10.4-14.0s — cakes / bakery
Run-Ffmpeg ($common + @(
    '-loop', '1', '-t', '3.6', '-i', $cakes,
    '-vf', "scale=-2:1920,crop=1080:1920:(iw-1080)/2:0,zoompan=z='min(zoom+0.0008,1.06)':d=90:s=1080x1920:fps=25,drawbox=x=55:y=1435:w=970:h=250:color=0x0B1220@0.90:t=fill,drawtext=fontfile='$font':text='CAKES & BAKES':fontcolor=white:fontsize=68:x=(w-text_w)/2:y=1500,drawtext=fontfile='$font':text='Take orders without the DM chaos.':fontcolor=0xF2B705:fontsize=37:x=(w-text_w)/2:y=1598",
    '-t', '3.6'
) + $encode + @((Join-Path $segments '03-cakes.mp4')))

# 13.8-17.4s — digital products
Run-Ffmpeg ($common + @(
    '-loop', '1', '-t', '3.6', '-i', $digital,
    '-vf', "scale=-2:1920,crop=1080:1920:(iw-1080)/2:0,zoompan=z='min(zoom+0.0006,1.05)':d=90:s=1080x1920:fps=25,drawbox=x=55:y=1435:w=970:h=250:color=0x0B1220@0.90:t=fill,drawtext=fontfile='$font':text='DIGITAL PRODUCTS':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=1500,drawtext=fontfile='$font':text='Courses. Guides. Downloads.':fontcolor=0xF2B705:fontsize=40:x=(w-text_w)/2:y=1598",
    '-t', '3.6'
) + $encode + @((Join-Path $segments '04-digital.mp4')))

# 17.2-22.3s — real product setup footage
Run-Ffmpeg ($common + @(
    '-ss', '3', '-t', '5.1', '-i', (Join-Path $reels '03-add-a-product.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=55:y=1435:w=970:h=250:color=0x0B1220@0.90:t=fill,drawtext=fontfile='$font':text='ONE SIMPLE STORE':fontcolor=white:fontsize=67:x=(w-text_w)/2:y=1500,drawtext=fontfile='$font':text='Add products. Share one link.':fontcolor=0xF2B705:fontsize=40:x=(w-text_w)/2:y=1598"
) + $encode + @((Join-Path $segments '05-setup.mp4')))

# 22.1-26.2s — real dashboard and verified value claims
Run-Ffmpeg ($common + @(
    '-ss', '2', '-t', '4.1', '-i', (Join-Path $reels '02-dashboard-and-store-link.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=55:y=1415:w=970:h=285:color=0x0B1220@0.92:t=fill,drawtext=fontfile='$font':text='NO SETUP FEES':fontcolor=white:fontsize=65:x=(w-text_w)/2:y=1465,drawtext=fontfile='$font':text='ZERO SALES COMMISSION':fontcolor=0xF2B705:fontsize=54:x=(w-text_w)/2:y=1555,drawtext=fontfile='$font':text='You keep what you earn.':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=1640"
) + $encode + @((Join-Path $segments '06-value.mp4')))

# 26-30s — official logo and CTA
Run-Ffmpeg ($common + @(
    '-f', 'lavfi', '-i', 'color=c=0x0B1220:s=1080x1920:r=25:d=4',
    '-loop', '1', '-i', $logoDark,
    '-filter_complex', "[1:v]scale=720:-1[logo];[0:v][logo]overlay=(W-w)/2:360,drawbox=x=90:y=760:w=900:h=4:color=0x159947:t=fill,drawtext=fontfile='$font':text='START SETTING UP':fontcolor=white:fontsize=76:x=(w-text_w)/2:y=875,drawtext=fontfile='$font':text='IN AROUND 2 MINUTES':fontcolor=0xF2B705:fontsize=67:x=(w-text_w)/2:y=990,drawtext=fontfile='$font':text='No complicated e-commerce build.':fontcolor=white:fontsize=39:x=(w-text_w)/2:y=1125,drawbox=x=180:y=1275:w=720:h=130:color=0x159947:t=fill,drawtext=fontfile='$font':text='oshicart.com/signup':fontcolor=white:fontsize=49:x=(w-text_w)/2:y=1315",
    '-t', '4'
) + $encode + @((Join-Path $segments '07-end-card.mp4')))

$visual = Join-Path $promo 'oshicart-variety-promo-visual.mp4'
Run-Ffmpeg ($common + @(
    '-i', (Join-Path $segments '00-opener.mp4'),
    '-i', (Join-Path $segments '01-fashion.mp4'),
    '-i', (Join-Path $segments '02-beauty.mp4'),
    '-i', (Join-Path $segments '03-cakes.mp4'),
    '-i', (Join-Path $segments '04-digital.mp4'),
    '-i', (Join-Path $segments '05-setup.mp4'),
    '-i', (Join-Path $segments '06-value.mp4'),
    '-i', (Join-Path $segments '07-end-card.mp4'),
    '-filter_complex', '[0:v][1:v]xfade=transition=fade:duration=0.2:offset=3.6[x1];[x1][2:v]xfade=transition=fade:duration=0.2:offset=7.0[x2];[x2][3:v]xfade=transition=fade:duration=0.2:offset=10.4[x3];[x3][4:v]xfade=transition=fade:duration=0.2:offset=13.8[x4];[x4][5:v]xfade=transition=fade:duration=0.2:offset=17.2[x5];[x5][6:v]xfade=transition=fade:duration=0.2:offset=22.1[x6];[x6][7:v]xfade=transition=fade:duration=0.2:offset=26.0,fade=t=in:st=0:d=0.2,fade=t=out:st=29.7:d=0.3[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '25', '-t', '30', '-movflags', '+faststart', $visual
))

$final = Join-Path $promo 'oshicart-variety-promo-final.mp4'
Run-Ffmpeg ($common + @(
    '-i', $visual, '-i', $voice,
    '-filter_complex', '[1:a]atempo=1.025,loudnorm=I=-14:TP=-3:LRA=7,adelay=300:all=1,apad,aresample=48000,asetpts=N/SR/TB[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '30', '-movflags', '+faststart', $final
))

Write-Output $final
