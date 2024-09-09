let synthesizeAudio = require('./synthesizeAudio.js');
let getSegmentsForVideoScriptItem = require('./getSegmentsForVideoScriptItem.js');
let child_process = require('child_process');
let path = require('path');
function cutAudioFromTimestamp(audioFile, timestamp) {
    let cutAudioFile = path.join(__dirname, 'cut_' + timestamp + '.mp3');
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-ss', timestamp,
        '-c', 'copy',
        '-y',
        cutAudioFile,
    ], {
        stdio: 'inherit',
    });

    return audioFile;
}
async function getCorrectedVideoScriptItems(videoScript, audioFile) {
    let segments = await synthesizeAudio(audioFile, videoScript);
    let correctedVideoScript = [];
    let cutAudioFrom = 0;
    for (let i = 0; i < videoScript.length; i++) {
        let videoScriptItem = videoScript[i];
        videoScriptItem.aligned = getSegmentsForVideoScriptItem(videoScriptItem, segments);
        if (i > 1) {
            break;
        }
        cutAudioFrom = videoScriptItem.aligned.slice(-1)[0].end;
        segments = segments.slice(videoScriptItem.aligned.length);
        correctedVideoScript.push(videoScriptItem);
    }
    // console.log('correctedVideoScript', correctedVideoScript);

    return {
        audioLeft: cutAudioFromTimestamp(audioFile, cutAudioFrom),
        correctedVideoScriptItems: correctedVideoScript
    };
}

module.exports = getCorrectedVideoScriptItems;
