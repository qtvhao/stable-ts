let child_process = require('child_process');
let alignRegressionVideoScript = require('./alignRegressionVideoScript.js');

async function getCheckedAlignedVideoScript(job, audioFile) {
    // convert to mp3
    let audioFileMp3 = audioFile.replace('.aac', '.mp3');
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-y',
        audioFileMp3,
    ], {
        stdio: 'ignore', // 'inherit' or 'pipe' or 'ignore'
    });
    audioFile = audioFileMp3;

    job.data.videoScript = await alignRegressionVideoScript(job.data.videoScript, audioFile);
    let lastVideoScriptItem = job.data.videoScript.slice(-1)[0];
    let lastVideoScriptItem_End = lastVideoScriptItem.end;
    let lastVideoScriptItem_Start = lastVideoScriptItem.start;

    if (typeof lastVideoScriptItem_Start === 'undefined' || typeof lastVideoScriptItem_End === 'undefined') {
        throw new Error('The last video script item start and end are undefined. This is not allowed. Start: ' + lastVideoScriptItem_Start + ', End: ' + lastVideoScriptItem_End);
    }

    if (lastVideoScriptItem_Start === lastVideoScriptItem_End) {
        throw new Error('The last video script item start and end are the same. This is not allowed. Start: ' + lastVideoScriptItem_Start + ', End: ' + lastVideoScriptItem_End);
    } else {
        console.log('All aligned');
        console.log('videoScript', job.data.videoScript.map(x => {
            return x.aligned.map(x => x.text).join('');
        }).join('\n'.repeat(5)))
    }

    return job.data.videoScript;
}

module.exports = getCheckedAlignedVideoScript;
