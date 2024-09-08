let getAudioMp3Duration = require('./getAudioMp3Duration');
let getCorrectedVideoScriptItems = require('./getCorrectedVideoScriptItems');
let fs = require('fs');
let path = require('path');
let alignInputDir = path.join(__dirname, '..', 'align-input');
function logToFile(text) {
    let logsFile = path.join(alignInputDir, 'logs.txt');
    if (!fs.existsSync(logsFile)) {
        fs.writeFileSync(logsFile, '');
    }
    fs.appendFileSync(logsFile, text);
}

async function alignRegressionVideoScript(videoScript, audioFile) {
    let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    logToFile(" \n\n-> Align video script - Total sections: " + videoScript.length + "\n");
    logToFile(" \n" + videoScript.map(x => "| " + x.text.slice(0, 100).replace(/\n/g, ' ')).join('\n') + '\n');
    logToFile("   - Before cut, audio mp3 duration: " + beforeCutAudioDuration + "s\n");

    let {correctedVideoScriptItems, audioLeft} = await getCorrectedVideoScriptItems(videoScript, audioFile);

    let incorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);
    if (incorrectedVideoScriptItems.length === 0) {
        return correctedVideoScriptItems;
    }

    logToFile("   - Corrected video script items: " + correctedVideoScriptItems.length + "\n");
    logToFile("   - Incorrected video script items: " + incorrectedVideoScriptItems.length + "\n");

    let othersAligned = await alignRegressionVideoScript(incorrectedVideoScriptItems, audioLeft);

    let lastCorrectedVideoScriptItem = correctedVideoScriptItems.slice(-1)[0];
    let aligned = lastCorrectedVideoScriptItem.aligned;
    let lastCorrectedSegment = aligned.slice(-1)[0];
    othersAligned = othersAligned.map(x => {
        return {
            ...x,
            start: x.start + lastCorrectedSegment.end,
            end: x.end + lastCorrectedSegment.end,
        }
    });

    return [
        ...correctedVideoScriptItems,
        ...othersAligned,
    ];
}

module.exports = alignRegressionVideoScript;