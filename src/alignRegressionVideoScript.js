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

async function alignRegressionVideoScript(videoScript, audioFile, zeroIndexStartTime = 0) {
    let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    logToFile(" \n\n-> Align video script - Total sections: " + videoScript.length + "\n");
    logToFile(" \n" + videoScript.map(x => "| " + x.text.slice(0, 100).replace(/\n/g, ' ')).join('\n') + '\n');
    logToFile("   - Before cut, audio mp3 duration: " + beforeCutAudioDuration + "s\n");

    let {correctedVideoScriptItems, audioLeft} = await getCorrectedVideoScriptItems(videoScript, audioFile, zeroIndexStartTime);

    let incorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);
    if (incorrectedVideoScriptItems.length === 0) {
        return correctedVideoScriptItems;
    }

    logToFile("   - Corrected video script items: " + correctedVideoScriptItems.length + "\n");
    logToFile("   - Incorrected video script items: " + incorrectedVideoScriptItems.length + "\n");

    let lastCorrectedSegment = correctedVideoScriptItems.slice(-1)[0].aligned.slice(-1)[0];
    let othersAligned = await alignRegressionVideoScript(incorrectedVideoScriptItems, audioLeft, lastCorrectedSegment.end);

    return [
        ...correctedVideoScriptItems,
        ...othersAligned,
    ];
}

module.exports = alignRegressionVideoScript;
