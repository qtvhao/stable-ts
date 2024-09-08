let synthesizeAudio = require('./synthesizeAudio.js');
let levenshtein = require('fast-levenshtein');
async function getCorrectedVideoScriptItems(videoScript, audioFile) {
    let segments = await synthesizeAudio(audioFile, videoScript);
    console.log(segments);
    segments = segments.map((segment, i, self) => {
        if (i === 0) {
            return {
                start: segment.start,
                end: segment.end,
                text: segment.text,
                previousSilenceDuration: 0,
            }
        }
        return {
            start: segment.start,
            end: segment.end,
            text: segment.text,
            previousSilenceDuration: segment.start - self[i - 1].end,
        };
    });
    // 
    console.log(segments);
    let bestMatchSegment = segments.map((segment, i, self) => {

    }).reduce((best, current) => {
        return best.levenshteinDistance < current.levenshteinDistance ? best : current;
    }, {
        levenshteinDistance: Infinity,
        segmentsFromStart: [],
    });
    throw new Error('Not implemented');
    let timestamp = 0;
    let correctedVideoScriptItems = videoScript.slice(0, 2).map(x => {
        let start = timestamp;
        timestamp++;
        let end = timestamp;
        return {
            start,
            end,
            text: x.headings.join(' '),
            aligned: [
                {
                    start: 1,
                    end: 2,
                    text: x.headings.join(' '),
                }
            ]
        };
    });

    return {
        correctedVideoScriptItems, 
        audioLeft: audioFile
    };
}

module.exports = getCorrectedVideoScriptItems;
