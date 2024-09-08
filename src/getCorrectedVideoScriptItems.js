let synthesizeAudio = require('./synthesizeAudio.js');
let getSegmentsForVideoScriptItem = require('./getSegmentsForVideoScriptItem.js');
function cutAudioFromTimestamp(audioFile, _timestamp) {
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

    return {
        audioLeft: cutAudioFromTimestamp(audioFile, cutAudioFrom),
        correctedVideoScriptItems: correctedVideoScript
    };
}

module.exports = getCorrectedVideoScriptItems;
