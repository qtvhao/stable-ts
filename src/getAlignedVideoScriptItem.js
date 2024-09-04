function removeSpecialCharacters(text) {
    return removeMd(text)
        .replace(/[:,\'\"\?\!\;\.\(\)\[\]\{\}\n]/g, ' ')
        .replace(/#+/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
}
let removeMd = require('remove-markdown');
let levenshtein = require('fast-levenshtein');

function getAlignedVideoScriptItem(videoScript, segments, videoScriptIndex) {
    // set previous silence duration
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
    // set next silence duration
    segments = segments.map((segment, i, self) => {
        if (i === self.length - 1) {
            return segment;
        }
        return {
            ...segment,
            nextSilenceDuration: self[i + 1].start - segment.end,
        };
    });
    // set duration
    segments = segments.map((segment) => {
        let previousSilenceDuration = segment.previousSilenceDuration || 0;
        let nextSilenceDuration = segment.nextSilenceDuration || 0;
        return {
            ...segment,
            duration: segment.end - segment.start,
            previousToNextRatio: nextSilenceDuration / previousSilenceDuration,
        };
    });

    segments = segments.map((segment, i, self) => {
        if (i === 0) {
            return segment;
        }
        return {
            ...segment,
            start: self[i - 1].end,
        };
    });
    let segmentsWithTextFromStart = segments.map((_segment, i, self) => {
        let segmentFromStart = self.slice(0, i);
        if (i === 0) {
            segmentFromStart = [self[0]];
        }
        // 
        let lastSegment = segmentFromStart[segmentFromStart.length - 1];
        // eg: next 0.32 and previous 2.88, ratio is 0.11
        console.log('lastSegment.previousToNextRatio', lastSegment)
        if (lastSegment.text.trim().match(/^#+\s\d+/)) {
            // console.log('lastSegment.text.trim().startsWith("#")', lastSegment);
            // throw new Error('lastSegment.text.trim().startsWith("#")');
            return {
                levenshteinDistance: 100000,
                segmentFromStart,
            }
        }
        if (lastSegment.previousToNextRatio < 0.15) {
            // this segment is close to the next segment
            console.log('this segment is close to the next segment');
            return {
                levenshteinDistance: 100000,
                segmentFromStart,
            }
        } else {
            console.log('this segment is close to the previous segment');
            // this segment is close to the previous segment
        }
        // 
        let segmentsFromStartText = removeSpecialCharacters(segmentFromStart.map(x => x.text).join('').trim()).slice(-200);
        let videoScriptItemText = removeSpecialCharacters(videoScript[videoScriptIndex].text).slice(-200);
        let levenshteinDistance = levenshtein.get(segmentsFromStartText, videoScriptItemText);
        // 
        return {
            levenshteinDistance,
            segmentFromStart,
        };
    });
    let bestMatch = segmentsWithTextFromStart.reduce((best, current) => {
        return best.levenshteinDistance < current.levenshteinDistance ? best : current;
    });

    return bestMatch.segmentFromStart;
}

module.exports = getAlignedVideoScriptItem;
