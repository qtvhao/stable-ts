let path = require('path');
let fs = require('fs');
let child_process = require('child_process');
let alignInputDir = '/align-input/';
if (process.platform === 'darwin') {
    alignInputDir = './align-input/';
}
if (!fs.existsSync(alignInputDir)) {
    fs.mkdirSync(alignInputDir);
}

async function getAudioMp3Duration(audioMp3) {
    let stdout = await new Promise((resolve, reject) => {
        child_process.execFile('ffprobe', [
            audioMp3
        ], {
            encoding: 'utf8',
            // stdio: 'pipe'
        }, (err, stdout, stderr) => {
            // console.log('stdout', stdout);
            // console.log('stderr', stderr);
            // console.log('err', err);
            fs.writeFileSync(path.join(alignInputDir, 'ffprobe-stderr.txt'), stderr.toString().trim());
            if (err) {
                reject(err);
            } else {
                resolve(stderr.toString().trim());
            }
        });
    });

    //   Duration: 00:03:20.76, start: 0.046042, bitrate: 160 kb/s
    let duration = stdout.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    let hours = parseInt(duration[1]);
    let minutes = parseInt(duration[2]);
    let seconds = parseInt(duration[3]);
    let milliseconds = parseInt(duration[4]);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

    return totalSeconds;
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
let getCorrectedVideoScriptIndex = require('./getCorrectedVideoScriptIndex.js');
function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
let model = process.env.STABLE_TS_MODEL || 'tiny';
let language = process.env.STABLE_TS_LANGUAGE || 'vi';
let alignOutputDir = '/align-output/';
if (!fs.existsSync(alignOutputDir)) {
    alignOutputDir = './align-output/';
}
function removeSpecialCharacters(text) {
    return removeMd(text)
        .replace(/[:,\'\"\?\!\;\.\(\)\[\]\{\}\n]/g, ' ')
        .replace(/#+/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
}
let removeMd = require('remove-markdown');

function synthesizeAudio(audioFile, videoScript) {
    let alignTxtContent = videoScript.map(x => {
        let text = x.text.trim();
        text = text.replace(/\.$/, '') + '.';

        return text;
    }).join('\n\n');
    let djb2Hash = djb2(alignTxtContent + ' ' + model + ' ' + language);
    let outputFile = path.join(alignOutputDir, 'output-' + djb2Hash + '.json');
    if (fs.existsSync(outputFile)) {
        return outputFile;
    }
    let alignFileTxt = path.join(alignOutputDir, 'output-' + djb2Hash + '.txt');
    fs.writeFileSync(alignFileTxt, removeSpecialCharacters(alignTxtContent));
    let stableTsArgs = [
        audioFile,
        '--model', model,
        '--language', language,
        '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ];
    console.log('stable-ts', stableTsArgs);

    child_process.execFileSync('stable-ts', stableTsArgs, {
        stdio: 'inherit',
    });
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    alignedSubtitle.segments = alignedSubtitle.segments.map(x => {
        delete x.words;
        delete x.tokens;
        return x;
    });
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));

    return outputFile;
}
async function cutAudioFileByTimestamp(audioFile, cutAudioFile, timestamp_a) {
    fs.appendFileSync('/align-input/logs.txt', "   - Cut from " + timestamp_a + "s\n");
    let timestamp = getTimestampForFFMpeg(timestamp_a);
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-ss', timestamp,
        '-c', 'copy',
        '-y',
        cutAudioFile,
    ]);
}
let cutIndex = 0;
async function cutAudioFileByCorrectedVideoScriptItems(correctedVideoScriptItems, audioFile) {
    let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1].aligned;
    let lastCorrectedSegment = lastCorrectedVideoScriptItem[lastCorrectedVideoScriptItem.length - 1];
    let lastCorrectedSegmentEnd = lastCorrectedSegment.end;

    cutIndex++;
    let cutAudioFile = '/tmp/cut-audio-' + cutIndex + '.mp3';
    // let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    // if (lastCorrectedSegmentEnd > 60) {
        // throw new Error('lastCorrectedSegmentEnd > 60');
    // }
    await cutAudioFileByTimestamp(audioFile, cutAudioFile, lastCorrectedSegmentEnd);
    // console.log('timestamp', lastCorrectedSegmentEnd);
    fs.appendFileSync('/align-input/logs.txt', "   - After cut, audio mp3 duration: " + (await getAudioMp3Duration(cutAudioFile)) + "s\n");

    return cutAudioFile;
}

async function alignVideoScript(videoScript, audioFile) {
    let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    fs.appendFileSync(path.join(alignInputDir, 'logs.txt'), " \n\n-> Align video script - Total sections: " + videoScript.length + "\n");
    fs.appendFileSync(path.join(alignInputDir, 'logs.txt'), " \n" + videoScript.map(x => "| " + x.text.slice(0, 100).replace(/\n/g, ' ')).join('\n') + '\n');
    // 
    fs.appendFileSync(path.join(alignInputDir, 'logs.txt'), "   - Before cut, audio mp3 duration: " + beforeCutAudioDuration + "s\n");
    let outputFile = synthesizeAudio(audioFile, videoScript);
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // 
    let segments = alignedSubtitle.segments;

    let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);

    if (correctedVideoScriptItems.length === videoScript.length) {
        return correctedVideoScriptItems;
    }

    let incorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);
    fs.appendFileSync(path.join(alignInputDir, 'logs.txt'), "   - Corrected video script items: " + correctedVideoScriptItems.length + "\n");
    fs.appendFileSync(path.join(alignInputDir, 'logs.txt'), "   - Incorrected video script items: " + incorrectedVideoScriptItems.length + "\n");

    if (incorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length) {
        throw new Error('incorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');
    }
    if (correctedVideoScriptItems.slice(-1)[0].aligned.slice(-1)[0].end > 60) {
        fs.writeFileSync('./align-segments/' + new Date().getTime() + '.json', JSON.stringify(segments, null, 2));
        fs.writeFileSync('./align-scripts/' + new Date().getTime() + '.json', JSON.stringify(videoScript, null, 2));

        throw new Error('correctedVideoScriptItems.slice(-1)[0].aligned.slice(-1)[0].end > 60');
    }
    // 
    let cutAudioFile = await cutAudioFileByCorrectedVideoScriptItems(correctedVideoScriptItems, audioFile)
    // 
    let others = [];
    if (cutAudioFile) {
        others = await alignVideoScript(incorrectedVideoScriptItems, cutAudioFile);
        // we must matches timestamp with correctedVideoScriptItems, timestamp of others starts from 0
        let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1];
        let aligned = lastCorrectedVideoScriptItem.aligned;
        let lastCorrectedSegment = aligned[aligned.length - 1];
        let lastCorrectedSegmentEnd = lastCorrectedSegment.end;
        others = others.map(x => {
            return {
                ...x,
                start: x.start + lastCorrectedSegmentEnd,
                end: x.end + lastCorrectedSegmentEnd,
            }
        });
    }
    return [
        ...correctedVideoScriptItems,
        ...others,
    ];
}

module.exports = alignVideoScript;
