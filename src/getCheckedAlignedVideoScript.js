let alignRegressionVideoScript = require('./alignRegressionVideoScript.js');
let convertAudioFileMp3 = require('./convertAudioFileMp3.js')
let path = require('path');
let fs = require('fs');

async function getCheckedAlignedVideoScript(job, audioFile) {
    audioFile = convertAudioFileMp3(audioFile);
    let copiedAudioFile = path.join(__dirname, path.basename(audioFile) + '_copied.mp3');
    fs.copyFileSync(audioFile, copiedAudioFile);

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
    }

    return job.data.videoScript;
}

module.exports = getCheckedAlignedVideoScript;
