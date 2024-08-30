var levenshtein = require('fast-levenshtein');
let removeMd = require('remove-markdown');
let getAlignedSubtitle = function (audio, alignedSubtitle) {
    let videoScript = audio.data.videoScript;
    let segments = alignedSubtitle.segments;
    let currentSegment = 0;
    videoScript = videoScript.map(x => {
        x.translated = removeMd(x.text);
        return x;
    });
    let alignItemEnd;
    for (let i = 0; i < videoScript.length; i++) {
        let translated = videoScript[i].translated;
        let bestMatch = 100000;
        let aligned
        let last200
        let alignedAt

        for (let j = currentSegment; j < segments.length; j++) {
            let segmentsFromCurrent = segments.slice(currentSegment, j);
            if (i === videoScript.length - 1) {
                segmentsFromCurrent = segments.slice(currentSegment);
            }
            let segmentsFromCurrentText = segmentsFromCurrent.map(x => x.text).join('');
            let translatedLast200 = translated.slice(-200);
            let segmentsFromCurrentLast200 = segmentsFromCurrentText.slice(-200);
            let distance = levenshtein.get(translatedLast200, segmentsFromCurrentLast200);
            if (distance < bestMatch) {
                bestMatch = distance;
                alignedAt = j;
                aligned = segmentsFromCurrent;
                last200 = segmentsFromCurrentLast200;
            } else {
                // break;
            }
        }
        console.log('='.repeat(300));
        console.log('translated', translated);
        aligned = aligned.map(x => {
            return {
                start: x.start,
                end: x.end,
                text: x.text,
                words: x.words.map(y => {
                    return {
                        word: y.word,
                        start: y.start,
                        end: y.end,
                    };
                }),
            };
        });
        currentSegment = alignedAt;
        aligned.sort((a, b) => a.start - b.start);
        if (aligned.length === 0) {
            console.log('aligned', aligned);
            throw new Error('aligned.length === 0');
        }
        let alignedStart = aligned[0].start;
        let alignedEnd = aligned[aligned.length - 1].end;
        let duration = alignedEnd - alignedStart;
        if (duration <= 0) {
            // 
            console.log('aligned', aligned);
            console.log('i', i, '/', videoScript.length, 'aligned', aligned.map(x => x.words.map(y => y.word).join(' ')).join(' '));
            console.log('alignedStart === alignedEnd', alignedStart, alignedEnd);
            throw new Error(`alignedStart === alignedEnd, i: ${i}, out of ${videoScript.length}`)
        }
        // 
        for (let j = 0; j < aligned.length; j++) {
            let alignedItem = aligned[j];
            // 
            if (alignItemEnd) {
                alignedItem.start = alignItemEnd;
            }
            // 
            alignItemEnd = alignedItem.end;
        }
        if (i === 0) {
            aligned[0].start = 0;
        }
        videoScript[i].synthesizeDuration = duration;
        videoScript[i].aligned = aligned;
        videoScript[i].segmentsFromCurrentLast200 = last200;
        // console.log('bestMatch', bestMatch);
        // console.log('-'.repeat(100));
        // console.log('aligned', aligned);
        // console.log('-'.repeat(100));
        // console.log('bestMatchIndex', bestMatchIndex);
        // console.log('segmentsFromCurrent', segmentsFromCurrent);
        // console.log('translated', translated);
        // break;
    }
    // console.log(videoScript);

    return videoScript;
}

module.exports = {
    getAlignedSubtitle,
};
