let synthesizeAudio = require('./synthesizeAudio.js');
let getSegmentsForVideoScriptItem = require('./getSegmentsForVideoScriptItem.js');
let child_process = require('child_process');
let path = require('path');
function cutAudioFromTimestamp(audioFile, timestamp, i) {
    let cutAudioFile = path.join(__dirname, path.basename(audioFile) + '_cut_' + i + '.mp3');
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
async function getCorrectedVideoScriptItems(videoScript, audioFile, zeroIndexStartTime) {
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
        segments = segments.slice(videoScriptItem.aligned.length - 1);
        correctedVideoScript.push(videoScriptItem);
    }
    // console.log('correctedVideoScript', correctedVideoScript);
    let remainingVideoScriptCount = videoScript.length - correctedVideoScript.length;
    let audioLeft;
    if (remainingVideoScriptCount === 0) {
        audioLeft = false
    } else {
        audioLeft = cutAudioFromTimestamp(audioFile, cutAudioFrom, remainingVideoScriptCount);
    }
    // 
    correctedVideoScript = correctedVideoScript.map((correctedVideoScriptItem) => {
        let aligned = correctedVideoScriptItem.aligned;
        aligned = aligned.map((segment) => {
            let start = zeroIndexStartTime + segment.start;
            let end = zeroIndexStartTime + segment.end;
            end = Math.round(end * 1000) / 1000;
            start = Math.round(start * 1000) / 1000;
            return {
                ...segment,
                start,
                end,
            };
        });

        return {
            ...correctedVideoScriptItem,
            aligned: aligned,
        };
    });
    correctedVideoScript = correctedVideoScript.map((correctedVideoScriptItem) => {
        let aligned = correctedVideoScriptItem.aligned;
        let firstSegment = aligned[0];
        let lastSegment = aligned.slice(-1)[0];
        let start = Math.round(firstSegment.start * 1000) / 1000;
        let end = Math.round(lastSegment.end * 1000) / 1000;

        return {
            ...correctedVideoScriptItem,
            start: start,
            end: end,
        };
    });

    return {
        audioLeft: audioLeft,
        correctedVideoScriptItems: correctedVideoScript
    };
}

module.exports = getCorrectedVideoScriptItems;
