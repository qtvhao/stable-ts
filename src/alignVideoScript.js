let path = require('path');
let fs = require('fs');
let child_process = require('child_process');

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
let model = process.env.STABLE_TS_MODEL;
let language = process.env.STABLE_TS_LANGUAGE;
let alignOutputDir = '/align-output/';

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

function alignVideoScript(videoScript, audioFile) {
    let outputFile = synthesizeAudio(audioFile, videoScript);
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // 
    let segments = alignedSubtitle.segments;

    let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);

    if (correctedVideoScriptItems.length === videoScript.length) {
        return correctedVideoScriptItems;
    }

    let incorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);

    if (incorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length) {
        throw new Error('incorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');
    }
    // 
    let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1].aligned;
    let lastCorrectedSegment = lastCorrectedVideoScriptItem[lastCorrectedVideoScriptItem.length - 1];
    let lastCorrectedSegmentEnd = lastCorrectedSegment.end;
    console.log('lastCorrectedSegmentEnd', lastCorrectedSegmentEnd);

    let cutAudioFile = '/align-output/cut-audio-' + lastCorrectedSegmentEnd + '.mp3';
    let timestamp = getTimestampForFFMpeg(lastCorrectedSegmentEnd);
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-ss', timestamp,
        '-c', 'copy',
        '-y',
        cutAudioFile,
    ]);
    console.log('timestamp', incorrectedVideoScriptItems);

    return [
        ...correctedVideoScriptItems,
        ...alignVideoScript(incorrectedVideoScriptItems, cutAudioFile),
    ];
}

module.exports = alignVideoScript;
