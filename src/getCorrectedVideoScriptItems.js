let removeSpecialCharacters = require('./removeSpecialCharacters.js');
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
        let isTheLastVideoScriptItem = i === videoScript.length - 1;
        if (isTheLastVideoScriptItem) {
            console.log('segment', segments);
            videoScriptItem.aligned = segments;
        }else{
            videoScriptItem.aligned = getSegmentsForVideoScriptItem(videoScriptItem, segments);
        }
        cutAudioFrom = videoScriptItem.aligned.slice(-1)[0].end;
        segments = segments.slice(videoScriptItem.aligned.length);
        let text = removeSpecialCharacters(videoScriptItem.text).trim();
        let aligned = videoScriptItem.aligned;
        let firstSegment = aligned[0];
        let lastSegment = aligned.slice(-1)[0];
        // 
        let firstSegment_5Words = firstSegment.words.slice(0, 5).map(x => x.word).join('').trim();
        let lastSegment_5Words = lastSegment.words.slice(-5).map(x => x.word).join('').trim().replace(/\.$/, ' ').trim();
        // 
        let alignedWords = aligned.map(x => x.text).join(' ').trim();
        let console_log = (['='.repeat(10), alignedWords, '='.repeat(10), firstSegment_5Words, '='.repeat(10) + ' text: ', text, '='.repeat(10), lastSegment_5Words]).join(' ');
        // 
        if (firstSegment_5Words !== text.slice(0, firstSegment_5Words.length).trim()) {
            console.log(console_log);
            throw new Error('firstSegment_5Words !== text.slice(0, firstSegment_5Words.length).trim()');
        }
        if (lastSegment_5Words !== text.slice(-lastSegment_5Words.length).trim()) {
            console.log(console_log);
            throw new Error('lastSegment_5Words !== text.slice(-lastSegment_5Words.length).trim()');
        }
        correctedVideoScript.push(videoScriptItem);
    }

    let remainingVideoScriptCount = videoScript.length - correctedVideoScript.length;
    let audioLeft;
    if (remainingVideoScriptCount === 0) {
        audioLeft = false
    } else {
        audioLeft = cutAudioFromTimestamp(audioFile, cutAudioFrom, '' + zeroIndexStartTime);
    }
    // 
    correctedVideoScript = correctedVideoScript.map((correctedVideoScriptItem) => {
        let aligned = correctedVideoScriptItem.aligned;
        aligned = aligned.map((segment) => {
            let words = segment.words.map((word) => {
                let start = zeroIndexStartTime + word.start;
                let end = zeroIndexStartTime + word.end;
                end = Math.round(end * 1000) / 1000;
                start = Math.round(start * 1000) / 1000;
                return {
                    ...word,
                    start,
                    end,
                };
            });
            let start = zeroIndexStartTime + segment.start;
            let end = zeroIndexStartTime + segment.end;
            end = Math.round(end * 1000) / 1000;
            start = Math.round(start * 1000) / 1000;
            return {
                ...segment,
                start,
                end,
                words,
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
