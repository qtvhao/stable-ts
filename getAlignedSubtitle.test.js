let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let removeMd = require('remove-markdown');
let fs = require('fs');
let path = require('path');
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
function checkAligned(alignFileTxt, outputFile, audio, audioFile) {

    let {
        audioFilePart1,
        audioFilePart2,
    } = cutAudioByLongestSilence(audioFile);
    let outputFilePart1 = '/align-output/output-part1.json';
    // let outputFilePart2 = '/align-output/output-part2.json';
    child_process.execFileSync('stable-ts', [
        audioFilePart1,
        '--model', model,
        '--language', language,
        // '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFilePart1,
        '-fw',
    ], {
        stdio: 'inherit',
    });
    console.log('done 1');

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
