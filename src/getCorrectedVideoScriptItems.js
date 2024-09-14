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
let levenshtein = require('fast-levenshtein');
async function getCorrectedVideoScriptItems(videoScript, audioFile, zeroIndexStartTime) {
    let segments = await synthesizeAudio(audioFile, videoScript);
    let correctedVideoScript = [];
    let cutAudioFrom = 0;
    for (let i = 0; i < videoScript.length; i++) {
        let videoScriptItem = videoScript[i];
        let isTheLastVideoScriptItem = i === videoScript.length - 1;
        if (isTheLastVideoScriptItem) {
            // console.log('segment', segments);
            videoScriptItem.aligned = segments;
        }else{
            videoScriptItem.aligned = getSegmentsForVideoScriptItem(videoScriptItem, segments);
            cutAudioFrom = videoScriptItem.aligned.slice(-1)[0].end;
            segments = segments.slice(videoScriptItem.aligned.length);
        }
        let text = removeSpecialCharacters(videoScriptItem.text).trim();
        let aligned = videoScriptItem.aligned;
        // // 
        let accAligned = aligned.reduce((acc, segment) => { return [...acc, ...segment.words.map(x => x.word)] }, []);
        let firstSegment_5Words = accAligned.slice(0, 15).join('').trim();
        let lastSegment_5Words = accAligned.slice(-15).join('').trim().replace(/\.$/, ' ').trim();
        // // 
        let log = ([
            // '='.repeat(10), alignedWords,
            '='.repeat(10), firstSegment_5Words,
            '='.repeat(10) + ' text: ', text, 
            '='.repeat(10), lastSegment_5Words,
            // '='.repeat(10), nearLastSegment_5Words,
        ]).join(' ');
        // 
        let aEnd = levenshtein.get(firstSegment_5Words, text.slice(0, firstSegment_5Words.length).trim()) / firstSegment_5Words.length;
        let zEnd = levenshtein.get(lastSegment_5Words, text.slice(-lastSegment_5Words.length).trim()) / lastSegment_5Words.length;
        if (aEnd > 0.2) { // lower is better
            console.log(log, '=', aEnd);
            throw new Error('firstSegment_5Words !== text.slice(0, firstSegment_5Words.length).trim()');
        }
        if (zEnd > 0.2) { // lower is better
            console.log(log, '=', zEnd);
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
