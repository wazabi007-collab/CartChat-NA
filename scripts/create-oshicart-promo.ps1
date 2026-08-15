$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$reels = Join-Path $repo 'output\playwright\oshicart-reels'
$promo = Join-Path $repo 'output\playwright\oshicart-promo'
$segments = Join-Path $promo 'segments'
$ffmpeg = 'C:\tmp\oshicart-video-tools\node_modules\ffmpeg-static\ffmpeg.exe'
$font = 'C\:/Windows/Fonts/arialbd.ttf'
$logo = Join-Path (Split-Path -Parent $repo) 'brand\logo-horizontal-2x.png'
$introImage = Join-Path (Split-Path -Parent (Split-Path -Parent $repo)) 'OshiCart_Short_Form_Video_Drop_Folder\03_MARKETING_IMAGES\C1- before and After.png'
$voice = Join-Path $promo 'oshicart-30-second-promo-voiceover-female.mp3'

New-Item -ItemType Directory -Force -Path $promo, $segments | Out-Null

function Run-Ffmpeg {
    param([string[]]$Arguments)
    & $ffmpeg @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed with exit code $LASTEXITCODE"
    }
}

$common = @('-hide_banner', '-loglevel', 'error', '-y')
$encode = @('-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25')

Run-Ffmpeg ($common + @(
    '-loop', '1', '-t', '4.2', '-i', $introImage,
    '-vf', "crop=iw/2:ih:0:0,scale=1080:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,zoompan=z='min(zoom+0.0007,1.07)':d=105:s=1080x1920:fps=25,boxblur=2:1,drawbox=x=0:y=0:w=iw:h=ih:color=0x0B1220@0.58:t=fill,drawtext=fontfile='$font':text='STILL SELLING':fontcolor=white:fontsize=78:x=(w-text_w)/2:y=590,drawtext=fontfile='$font':text='IN YOUR DMs?':fontcolor=0xF2B705:fontsize=96:x=(w-text_w)/2:y=700,drawtext=fontfile='$font':text='There is a smarter way.':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=840",
    '-t', '4.2'
) + $encode + @((Join-Path $segments '00-hook.mp4')))

Run-Ffmpeg ($common + @(
    '-ss', '0', '-t', '4.2', '-i', (Join-Path $reels '01-create-your-store.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=65:y=1450:w=950:h=250:color=0x0B1220@0.88:t=fill,drawtext=fontfile='$font':text='MEET OSHICART':fontcolor=white:fontsize=74:x=(w-text_w)/2:y=1515,drawtext=fontfile='$font':text='Your business, online.':fontcolor=0xF2B705:fontsize=42:x=(w-text_w)/2:y=1610"
) + $encode + @((Join-Path $segments '01-meet.mp4')))

Run-Ffmpeg ($common + @(
    '-ss', '3', '-t', '5.2', '-i', (Join-Path $reels '03-add-a-product.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=65:y=1450:w=950:h=250:color=0x0B1220@0.88:t=fill,drawtext=fontfile='$font':text='ADD PRODUCTS':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=1515,drawtext=fontfile='$font':text='Look professional. Sell clearly.':fontcolor=0xF2B705:fontsize=38:x=(w-text_w)/2:y=1610"
) + $encode + @((Join-Path $segments '02-products.mp4')))

Run-Ffmpeg ($common + @(
    '-ss', '2', '-t', '5.2', '-i', (Join-Path $reels '02-dashboard-and-store-link.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=65:y=1450:w=950:h=250:color=0x0B1220@0.88:t=fill,drawtext=fontfile='$font':text='SHARE ONE LINK':fontcolor=white:fontsize=70:x=(w-text_w)/2:y=1515,drawtext=fontfile='$font':text='WhatsApp. Facebook. Anywhere.':fontcolor=0xF2B705:fontsize=38:x=(w-text_w)/2:y=1610"
) + $encode + @((Join-Path $segments '03-link.mp4')))

Run-Ffmpeg ($common + @(
    '-ss', '0', '-t', '5.2', '-i', (Join-Path $reels '04-customer-shopping-flow.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=65:y=1450:w=950:h=250:color=0x0B1220@0.88:t=fill,drawtext=fontfile='$font':text='CUSTOMERS BROWSE & ORDER':fontcolor=white:fontsize=53:x=(w-text_w)/2:y=1525,drawtext=fontfile='$font':text='Prices and stock, clearly shown.':fontcolor=0xF2B705:fontsize=38:x=(w-text_w)/2:y=1610"
) + $encode + @((Join-Path $segments '04-shop.mp4')))

Run-Ffmpeg ($common + @(
    '-ss', '1', '-t', '4.2', '-i', (Join-Path $reels '05-manage-orders.mp4'),
    '-vf', "scale=1080:1920,drawbox=x=65:y=1450:w=950:h=250:color=0x0B1220@0.88:t=fill,drawtext=fontfile='$font':text='ORDERS, ORGANISED':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=1515,drawtext=fontfile='$font':text='Keep customers updated.':fontcolor=0xF2B705:fontsize=40:x=(w-text_w)/2:y=1610"
) + $encode + @((Join-Path $segments '05-orders.mp4')))

Run-Ffmpeg ($common + @(
    '-f', 'lavfi', '-i', 'color=c=0xF8FAFC:s=1080x1920:r=25:d=3',
    '-loop', '1', '-i', $logo,
    '-filter_complex', "[1:v]scale=760:-1[logo];[0:v][logo]overlay=(W-w)/2:430,drawbox=x=90:y=900:w=900:h=4:color=0x159947:t=fill,drawtext=fontfile='$font':text='SELL SMARTER.':fontcolor=0x0B1220:fontsize=94:x=(w-text_w)/2:y=990,drawtext=fontfile='$font':text='Create your free store today':fontcolor=0x526174:fontsize=43:x=(w-text_w)/2:y=1135,drawbox=x=185:y=1260:w=710:h=130:color=0x159947:t=fill,drawtext=fontfile='$font':text='oshicart.com/signup':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1300",
    '-t', '3'
) + $encode + @((Join-Path $segments '06-end-card.mp4')))

$visual = Join-Path $promo 'oshicart-30-second-promo-visual.mp4'
Run-Ffmpeg ($common + @(
    '-i', (Join-Path $segments '00-hook.mp4'),
    '-i', (Join-Path $segments '01-meet.mp4'),
    '-i', (Join-Path $segments '02-products.mp4'),
    '-i', (Join-Path $segments '03-link.mp4'),
    '-i', (Join-Path $segments '04-shop.mp4'),
    '-i', (Join-Path $segments '05-orders.mp4'),
    '-i', (Join-Path $segments '06-end-card.mp4'),
    '-filter_complex', '[0:v][1:v]xfade=transition=fade:duration=0.2:offset=4[x1];[x1][2:v]xfade=transition=fade:duration=0.2:offset=8[x2];[x2][3:v]xfade=transition=fade:duration=0.2:offset=13[x3];[x3][4:v]xfade=transition=fade:duration=0.2:offset=18[x4];[x4][5:v]xfade=transition=fade:duration=0.2:offset=23[x5];[x5][6:v]xfade=transition=fade:duration=0.2:offset=27,fade=t=in:st=0:d=0.2,fade=t=out:st=29.7:d=0.3[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '25', '-t', '30', '-movflags', '+faststart', $visual
))

$final = Join-Path $promo 'oshicart-30-second-promo-final.mp4'
Run-Ffmpeg ($common + @(
    '-i', $visual, '-i', $voice,
    '-filter_complex', '[1:a]atempo=1.06,loudnorm=I=-14:TP=-3:LRA=7,adelay=300:all=1,apad,aresample=48000,asetpts=N/SR/TB[a]',
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '30', '-movflags', '+faststart', $final
))

Write-Output $final
