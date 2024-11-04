let url = 'https://http-align-partnerapis-production-80.schnworks.com/todos';
let data = {
  accessKeyId: '7f5599ee-b77e-4c3a-89f0-76a017a60ad2',
  secretAccessKey: 'acee4aef-3eb0-4675-bac7-df651263da4f',
  jobData: {
    format: 'text-with-audio',
    text: ''
  },
};
let path = require('path');

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    }
}

function generateSplitId() {
    return Math.round(Math.random() * 1000000000);
}

function getSplitFolder(splitId) {
    return path.join(__dirname, 'splits', `${splitId}`);
}
const removeMd = require('remove-markdown');
let fs = require('fs');
function nestedMapObjects(tokens) {
    if (tokens.raw) {
        delete tokens.raw;
    }
    if (tokens.task) {
        delete tokens.task;
    }
    if (tokens.loose) {
        delete tokens.loose;
    }

    if (tokens.tokens) {
        tokens.tokens = tokens.tokens.map(nestedMapObjects);
    }
    if (tokens.items) {
        tokens.items = tokens.items.map(nestedMapObjects);
    }
    if (Array.isArray(tokens)) {
        tokens = tokens.map(nestedMapObjects);
    }

    return tokens;
}
function getTextFromListItem(list_item) {
    let text = list_item.text;
    return {
        text: removeMd(text),
    }
}
function getSegmentsOfList(token) {
    let items = token.items;
    items = items.map(getTextFromListItem);

    return items;
}
let child_process = require('child_process');
const { join } = require('path');
function getSilences(audioFile, silenceDuration) {
    let silencedetect = child_process.spawnSync('ffmpeg', [
        '-i', audioFile,
        '-af', `silencedetect=noise=-30dB:d=${silenceDuration}`,
        '-f', 'null', '-'
    ], {
        stdio: 'pipe',
    });

    let silenceLines = silencedetect.stderr.toString()
        .replace(/[\r\n]+/g, '\n')
        .split('\n')
        .filter(line => line.includes('silencedetect'));
    let silences = silenceLines.filter(line => line.includes('silence_end'))
        .map((line, i) => {
            let matcherSilenceEnd = /silence_end: (\d+\.\d+)/;
            let matcherSilenceDuration = /silence_duration: (\d+\.\d+)/;
            let silenceEnd = parseFloat(line.match(matcherSilenceEnd)[1]);
            let silenceDuration = parseFloat(line.match(matcherSilenceDuration)[1]);
            silenceEnd = Math.round(silenceEnd * 1000) / 1000;
            silenceDuration = Math.round(silenceDuration * 1000) / 1000;
            let silenceStart = silenceEnd - silenceDuration;
            silenceStart = Math.round(silenceStart * 1000) / 1000;

            let average = (silenceStart + silenceEnd) / 2;
            if (i === 0) {
                average = 0;
            }

            return {
                // start: silenceStart,
                // end: silenceEnd,
                // duration: silenceDuration,
                average: Math.round(average * 1000) / 1000,
            };
        });
    if (silences.length > 20) {
        return getSilences(audioFile, silenceDuration + .2);
    }else{
        console.log('Silences:', silences.length);
    }
    
    return silences;
}
function convertAACtoMP3(audioFile) {
    const mp3File = audioFile.replace('.aac', '.mp3');
    child_process.spawnSync('ffmpeg', [
        '-i', audioFile,
        '-q:a', '0',
        mp3File
    ]);
    return mp3File;
}
function splitAudioByStamps(audioFile, silences, splitFolder) {
    let files = [];
    for (let i = 0; i < silences.length; i++) {
        let silence = silences[i];
        let average = silence.average;
        let splitFile = join(splitFolder, `split-${`${i}`.padStart(3, '0')}`);
        // 
        if (0 === average) {
            continue;
        }
        let outputFile;
        let splitArgs = [
            '-y', '-i', audioFile, '-to', average, '-c', 'copy', outputFile = `${splitFile}-0-${`${average}`.replace('.', '-')}.mp3`
        ];
        // 
        if (i === silences.length - 1) {
            splitArgs = [
                '-y', '-i', audioFile, '-ss', average, '-c', 'copy', outputFile = `${splitFile}-${`${average}`.replace('.', '-')}-end.mp3`
            ];
        }
        if (i > 0) {
            splitArgs = [
                '-y', '-i', audioFile, '-ss', silences[i - 1].average, '-to', average, '-c', 'copy', outputFile = `${splitFile}-${
                    `${silences[i - 1].average}`.replace('.', '-')
                }-${
                    `${average}`.replace('.', '-')
                }.mp3`
            ];
        }
        let split = child_process.spawnSync('ffmpeg', splitArgs);
        files.push(outputFile);
        console.log(split.stdout.toString());
        console.log(split.stderr.toString());
    }
    
    return files;
}
function getJob() {
    let tJson = 't.json'
    let job = fs.readFileSync(tJson, 'utf8');
    let job1 = JSON.parse(job)[1];

    return JSON.parse(job1);
}
function getTokens() {
    let job = getJob();
    let tokens = (job.result.tokens);
    tokens = nestedMapObjects(tokens);
    tokens = tokens.reduce((acc, token) => {
        if (token.type === 'space') {
            // acc.push('='.repeat(251));
        }else{
            if ("list" === token.type) {
                acc = acc.concat(getSegmentsOfList(token));
            }else{
                acc.push({
                    type: (token.type),
                    text: (token.text),
                });
            }
        }
        return acc;
    }, []);

    return tokens;
}

function stableTsFolder(splitId, tokenJson) {
    let splitFolder_Id = getSplitFolder(splitId);
    let outputFile = join(splitFolder, 'output_' + splitId + '.json');
    
    child_process.spawnSync('python3', [
        'stable-ts-folder.py',
        splitFolder_Id,
        tokenJson,
        outputFile,
    ], {
        stdio: 'inherit',
    });
    let output = fs.readFileSync(outputFile, 'utf8');
    let outputJson = JSON.parse(output);

    return outputJson;
}

let splitFolder = join(__dirname, 'splits');
ensureDirectoryExists(splitFolder);
(async function() {
    let splitId = generateSplitId();
    let splitFolder_Id = getSplitFolder(splitId);
    fs.mkdirSync(splitFolder_Id);
    let audioFile = 'synthesize-result-2532432836.aac';
    splitAudioByStamps(
        convertAACtoMP3(audioFile),
        getSilences(audioFile, .5),
        splitFolder_Id
    );
    // 
    let tokens = getTokens();
    let tokenJson = join(splitFolder, 'tokens_' + splitId + '.json');
    fs.writeFileSync(tokenJson, JSON.stringify(tokens, null, 2));
    // 
    let stablized = stableTsFolder(splitId, tokenJson);
    console.log(stablized);
})();
