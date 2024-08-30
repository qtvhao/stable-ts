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
function cutAudioByLongestSilence(audioFile) {
    // find longest silence in audio
    let silenceFile = '/align-output/silence.txt';
    child_process.execFileSync('ffmpeg', ['-i', audioFile, '-af', 'silencedetect=n=-50dB:d=0.5,ametadata=print:file=' + silenceFile, '-f', 'null', '-']);
    let silence = fs.readFileSync(silenceFile, 'utf8');
    console.log('silence', JSON.stringify(silence, null, 2));
    let matcherStartEndDuration = /silence_start=(\d+(\.\d+)?).*?silence_end=(\d+(\.\d+)?).*?silence_duration=(\d+(\.\d+)?)/gis;
    let matches = silence.matchAll(matcherStartEndDuration);
    let silences = [];
    for (let match of matches) {
        silences.push({
            start: parseFloat(match[1]),
            end: parseFloat(match[3]),
            duration: parseFloat(match[5]),
        });
    }

    console.log('silences', JSON.stringify(silences, null, 2));
    let longestSilence = silences.reduce((longest, current) => {
        return current.duration > longest.duration ? current : longest;
    }, silences[0]);
    console.log('longestSilence', longestSilence);
    let start = longestSilence.start;
    // 
    let audioFileMp3 = '/align-output/audio.mp3';
    // convert to mp3
    child_process.execFileSync('ffmpeg', ['-y', '-i', audioFile, audioFileMp3]);
    // cut audio into 2 parts, from 0 to start, and start to end
    let audioFilePart1 = '/align-output/audio-part1.mp3';
    let audioFilePart2 = '/align-output/audio-part2.mp3';
    child_process.execFileSync('ffmpeg', ['-y', '-i', audioFileMp3, '-ss', 0, '-to', start, '-c', 'copy', audioFilePart1]);
    child_process.execFileSync('ffmpeg', ['-y', '-i', audioFileMp3, '-ss', start, '-c', 'copy', audioFilePart2]);

    return {
        audioFilePart1,
        audioFilePart2,
    };
}
function transcribeAudio(audioFile, outputFile) {
    child_process.execFileSync('stable-ts', [
        audioFile,
        '--model', model,
        '--language', language,
        // '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ], {
        stdio: 'pipe',
        // inherit mean output to console
        // pipe mean output to parent process
    });
}
function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
function transcribeAudioParts(audioFilePart1, audioFilePart2) {
    let outputFilePart1 = '/align-output/' + djb2(audioFilePart1) + '.json';
    let outputFilePart2 = '/align-output/' + djb2(audioFilePart2) + '.json';
    if (fs.existsSync(outputFilePart1) && fs.existsSync(outputFilePart2)) {
        return {
            outputFilePart1,
            outputFilePart2,
        };
    }
    transcribeAudio(audioFilePart1, outputFilePart1);
    transcribeAudio(audioFilePart2, outputFilePart2);

    return {
        outputFilePart1,
        outputFilePart2,
    };
}
function alignPartsWithAlignFileTxt(alignFileTxt, outputFilePart1, outputFilePart2) {
    console.log('outputFilePart1', outputFilePart1);
    console.log('outputFilePart2', outputFilePart2);
    // split alignFileTxt by 2, then compare with outputFilePart1 and outputFilePart2 use levenshtein distance
    let shortestDistance = 100000;
    let shortestDistanceAlignFileTxt = '';
    let words = alignFileTxt.split(' ');
    for (let i = 0; i < words.length; i++) {
        let alignFileTxtPart1 = words.slice(0, i).join(' ');
        let alignFileTxtPart2 = words.slice(i).join(' ');
        let distance1 = levenshtein.get(alignFileTxtPart1, outputFilePart1);
        let distance2 = levenshtein.get(alignFileTxtPart2, outputFilePart2);
        let totalDistance = distance1 + distance2;
        if (totalDistance < shortestDistance) {
            shortestDistance = totalDistance;
            shortestDistanceAlignFileTxt = [alignFileTxtPart1, alignFileTxtPart2];
        }
    }
    console.log('shortestDistance', shortestDistance);
    console.log('shortestDistanceAlignFileTxt', shortestDistanceAlignFileTxt);

    return shortestDistanceAlignFileTxt;
}
function checkAligned(alignFileTxt, outputFile, audio, audioFile) {
    let {
        audioFilePart1,
        audioFilePart2,
    } = cutAudioByLongestSilence(audioFile);
    let {
        outputFilePart1,
        outputFilePart2,
    } = transcribeAudioParts(audioFilePart1, audioFilePart2);
    let outputFilePart1Content = fs.readFileSync(outputFilePart1, 'utf8');
    let outputFilePart2Content = fs.readFileSync(outputFilePart2, 'utf8');
    let outputFilePart1Parsed = JSON.parse(outputFilePart1Content);
    let outputFilePart2Parsed = JSON.parse(outputFilePart2Content);
    let alignFileTxtContent = fs.readFileSync(alignFileTxt, 'utf8');

    // console.log('outputFilePart1', outputFilePart1.text);
    // console.log('outputFilePart2', outputFilePart2.text);
    let alignedWithAlignFileTxt = alignPartsWithAlignFileTxt(alignFileTxtContent, outputFilePart1Parsed.text, outputFilePart2Parsed.text);
    // console.log('alignedWithAlignFileTxt', alignedWithAlignFileTxt);
    process.exit(0);
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
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    // console.log('aligned', aligned);
    for (let i = 0; i < aligned.length; i++) {
        let alignedItem = aligned[i];
        expect(alignedItem.aligned).toBeDefined();
        // 
        let firstAligned = alignedItem.aligned[0];
        let lastAligned = alignedItem.aligned[alignedItem.aligned.length - 1];
        console.log('firstAligned', firstAligned, 'lastAligned', lastAligned);
        let firstAlignedStart = firstAligned.start;
        let lastAlignedEnd = lastAligned.end;
        if (firstAlignedStart === lastAlignedEnd) {
            console.log('firstAlignedStart === lastAlignedEnd', firstAligned, lastAligned);
            throw new Error('firstAlignedStart === lastAlignedEnd on ' + i + ' / ' + aligned.length);
        }
    }
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
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-2639383328.json');
    let audioFile = '/align-input/synthesize-result-2639383328.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});
