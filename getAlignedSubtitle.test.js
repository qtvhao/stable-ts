let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let removeMd = require('remove-markdown');
let fs = require('fs');
let path = require('path');
var levenshtein = require('fast-levenshtein');
console.log('='.repeat(300));

function removePunctuation(text) {
    return text.replace(/[\.,\),\(),\",\/,-,\?,\!,\:,\;,\n*]/g, ' ').replace(/\s+/g, ' ');
}
function getInput(alignFile) {
    let alignFilename = path.basename(alignFile);
    let alignFileContent = fs.readFileSync(alignFile, 'utf8');
    let alignFileParsed = JSON.parse(alignFileContent);
    let texts = alignFileParsed.data.videoScript.map(x => removeMd(x.text)).join('\n');
    texts = removePunctuation(texts);
    let alignFileTxt = '/align-input/' + alignFilename + '.txt';
    fs.writeFileSync(alignFileTxt, texts);
    let outputFile = '/align-output/output-' + alignFilename + '.json';

    return {
        alignFileTxt,
        outputFile,
        audio: alignFileParsed,
    };
}
let model = process.env.STABLE_TS_MODEL;
let language = 'vi';
let alignOutputDir = '/align-output/';
function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
function synthesizeAudio(audioFile, videoScript) {
    let alignTxtContent = videoScript.map(x => {
        let text = x.text.trim();
        text = text.replace(/\.$/, '') + '.';

        return text;
    }).join('\n\n');
    let djb2Hash = djb2(alignTxtContent);
    let outputFile = path.join(alignOutputDir, 'output-' + djb2Hash + '.json');
    if (fs.existsSync(outputFile)) {
        return outputFile;
    }
    let alignFileTxt = path.join(alignOutputDir, 'output-' + djb2Hash + '.txt');
    fs.writeFileSync(alignFileTxt, alignTxtContent);

    child_process.execFileSync('stable-ts', [
        audioFile,
        '--model', model,
        '--language', language,
        '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ], {
        stdio: 'inherit',
    });
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // alignedSubtitle.segments = alignedSubtitle.segments.map(x => {
    //     return {
    //         ...x,
    //         start: x.start.toFixed(2),
    //         end: x.end.toFixed(2),
    //     }
    // });
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));

    return outputFile;
}
function removeSpecialCharacters(text) {
    return removeMd(text)
        .replace(/[:,\'\"\?\!\;\.\(\)\[\]\{\}\n]/g, ' ')
        .replace(/#+/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
}
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
    // console.log('videoScript[videoScriptIndex].text', videoScript[videoScriptIndex].text);
    // console.log('bestMatch', bestMatch.segmentFromStart.map(x => x));
    // process.exit(0);

    return bestMatch.segmentFromStart;
}
function getCorrectedVideoScriptIndex(videoScript, segments) {
    let correctedVideoScript = [];
    for (let i = 0; i < videoScript.length; i++) {
        if (i > 1) {
            break;
        }
        let alignedVideoScriptItem = getAlignedVideoScriptItem(videoScript, segments, i);
        let alignedStart = alignedVideoScriptItem[0].start;
        let alignedEnd = alignedVideoScriptItem[alignedVideoScriptItem.length - 1].end;
        if (alignedStart === alignedEnd) {
            return correctedVideoScript;
        }
        correctedVideoScript.push({
            ...videoScript[i],
            aligned: alignedVideoScriptItem,
        });
    }

    return correctedVideoScript;
}
function getTimestampForFFMpeg(seconds) {
    let minutes = Math.floor((seconds % 3600) / 60);
    let seconds1 = Math.floor(seconds % 60);
    let miliseconds = Math.floor((seconds % 1) * 1000);

    minutes = minutes.toString().padStart(2, '0');
    seconds1 = seconds1.toString().padStart(2, '0');
    miliseconds = miliseconds.toString().padStart(3, '0');
    return `${minutes}:${seconds1}.${miliseconds}`;
}
function alignVideoScript(videoScript, audioFile) {
    let outputFile = synthesizeAudio(audioFile, videoScript);
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // 
    let segments = alignedSubtitle.segments;

    // console.log('videoScript', videoScript.map(x => x.text));
    let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);
    for (let i = 0; i < correctedVideoScriptItems.length; i++) {
        let correctedVideoScriptItem = correctedVideoScriptItems[i];
        let aligned = correctedVideoScriptItem.aligned;
        // let lastAligned = aligned[aligned.length - 1];
        // console.log('aligned', aligned.map(x => x.text).join(''));
        // console.log('correctedVideoScriptItem', correctedVideoScriptItem.text);
        // 
    }
    process.exit(0);
    console.log('correctedVideoScriptItems', correctedVideoScriptItems.length, videoScript.length);
    if (correctedVideoScriptItems.length === videoScript.length) {
        return correctedVideoScriptItems;
    }

    let uncorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);

    if (uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length) {
        throw new Error('uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');
    }
    // 
    let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1].aligned;
    let lastCorrectedSegment = lastCorrectedVideoScriptItem[lastCorrectedVideoScriptItem.length - 1];
    let lastCorrectedSegmentEnd = lastCorrectedSegment.end;
    console.log('lastCorrectedSegmentEnd', lastCorrectedSegmentEnd);
    process.exit(0);
    let cutAudioFile = '/align-output/cut-audio-' + lastCorrectedSegmentEnd + '.mp3';
    let timestamp = getTimestampForFFMpeg(lastCorrectedSegmentEnd);
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-ss', timestamp,
        '-c', 'copy',
        '-y',
        cutAudioFile,
    ]);
    console.log('timestamp', timestamp);
    process.exit(0);
    throw new Error('uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');

    return [
        ...correctedVideoScriptItems,
        ...alignVideoScript(uncorrectedVideoScriptItems, audioFile),
    ];
}
function checkAligned(job, audioFile) {
    let videoScript = job.data.videoScript;
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

    // console.log('videoScript', videoScript.map(x => x.text));
    videoScript = alignVideoScript(videoScript, audioFile);
    job.data.videoScript = videoScript;
    let lastVideoScriptItem = videoScript[videoScript.length - 1];
    let lastVideoScriptItemEnd = lastVideoScriptItem.end;
    let lastVideoScriptItemStart = lastVideoScriptItem.start;
    if (typeof lastVideoScriptItemStart === 'undefined' || typeof lastVideoScriptItemEnd === 'undefined') {
        throw new Error('lastVideoScriptItemStart or lastVideoScriptItemEnd is undefined');
    }

    if (lastVideoScriptItemStart === lastVideoScriptItemEnd) {
        throw new Error('lastVideoScriptItemStart === lastVideoScriptItemEnd ' + lastVideoScriptItemStart + ' === ' + lastVideoScriptItemEnd + ' , segment index: ' + (videoScript.length - 1));
    } else {
        console.log('All aligned');
        console.log('videoScript', videoScript.map(x => {
            return x.map(x => x.text).join('');
        })[0])
    }

    return job;
    // let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    // let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    // // console.log('aligned', aligned);
    // for (let i = 0; i < aligned.length; i++) {
    //     let alignedItem = aligned[i];
    //     expect(alignedItem.aligned).toBeDefined();
    //     // 
    //     let firstAligned = alignedItem.aligned[0];
    //     let lastAligned = alignedItem.aligned[alignedItem.aligned.length - 1];
    //     console.log('firstAligned', firstAligned, 'lastAligned', lastAligned);
    //     let firstAlignedStart = firstAligned.start;
    //     let lastAlignedEnd = lastAligned.end;
    //     if (firstAlignedStart === lastAlignedEnd) {
    //         console.log('firstAlignedStart === lastAlignedEnd', firstAligned, lastAligned);
    //         throw new Error('firstAlignedStart === lastAlignedEnd on ' + i + ' / ' + aligned.length);
    //     }
    // }
}
test('test alignment', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-1484178056.json');
    let audioFile = '/align-input/synthesize-result-1484178056.mp3';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
    // expect(aligned).toBeDefined();
});
test('test alignment 2', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-2544651730.json');
    let audioFile = '/align-input/synthesize-result-2544651730.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});
test('test alignment 3', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-1925143408.json');
    let audioFile = '/align-input/synthesize-result-1925143408.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});

test('test alignment 4', () => {
    let {
        // alignFileTxt,
        // outputFile,
        audio,
    } = getInput('/align-input/align-1585795898.json');
    let audioFile = '/align-input/synthesize-result-1585795898.aac';
    checkAligned(audio, audioFile)
});