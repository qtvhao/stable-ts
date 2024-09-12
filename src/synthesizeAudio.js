let path = require('path');
let fs = require('fs');
let child_process = require('child_process');
let removeSpecialCharacters = require('./removeSpecialCharacters.js');

function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
let model = process.env.STABLE_TS_MODEL || 'tiny';
let language = process.env.STABLE_TS_LANGUAGE || 'vi';
let alignOutputDir = path.join(__dirname, '..', 'align-output');
function postprocessSegments(segments) {
    segments = segments.map((segment) => {
        let start = segment.start;
        let end = segment.end;
        start = Math.round(start * 1000) / 1000;
        end = Math.round(end * 1000) / 1000;

        return {
            ...segment,
            start,
            end,
        };
    });
    // set previous silence duration
    segments = segments.map((segment, i, self) => {
        if (i === 0) {
            return {
                words: segment.words,
                start: segment.start,
                end: segment.end,
                text: segment.text,
                previousSilenceDuration: 0,
            }
        }
        return {
            words: segment.words,
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
        let previousToNextRatio = nextSilenceDuration / previousSilenceDuration;
        previousToNextRatio = Math.round(previousToNextRatio * 1000) / 1000;
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

    return segments;
}
async function synthesizeAudio(audioFile, videoScript) {
    let alignTxtContent = videoScript.map(x => {
        let text = x.text.trim();
        text = removeSpecialCharacters(text).replace(/\.$/, ' ').trim() + '.';

        return text;
    }).join('\n\n');
    let djb2Hash = djb2(alignTxtContent + ' ' + model + ' ' + language + ' ' + audioFile);
    let outputFile = path.join(alignOutputDir, 'output-' + djb2Hash + '.json');
    if (fs.existsSync(outputFile)) {
        let outputFileContent = fs.readFileSync(outputFile, 'utf8');
        let parsedOutputFileContent = JSON.parse(outputFileContent);
        let segments = parsedOutputFileContent.segments;

        return postprocessSegments(segments);
    }
    let alignFileTxt = path.join(alignOutputDir, 'output-' + djb2Hash + '.txt');
    fs.writeFileSync(alignFileTxt, alignTxtContent);
    let stableTsArgs = [
        audioFile,
        '--model', model,
        '--language', language,
        '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ];
    // console.log('stable-ts', stableTsArgs);

    child_process.execFileSync('stable-ts', stableTsArgs, {
        stdio: 'inherit',
    });
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    alignedSubtitle.segments = alignedSubtitle.segments.map(x => {
        // delete x.words;
        x.words = x.words.map(y => {
            return {
                start: y.start,
                end: y.end,
                word: y.word,
            };
        });
        delete x.tokens;
        delete x.avg_logprob;
        delete x.compression_ratio;
        delete x.no_speech_prob;
        delete x.seek;
        delete x.temperature;

        return x;
    });
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));

    return postprocessSegments(alignedSubtitle.segments);
}

module.exports = synthesizeAudio;
