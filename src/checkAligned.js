let child_process = require('child_process');
let alignVideoScript = require('./alignVideoScript.js');
async function checkAligned(job, audioFile) {
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
    videoScript = await alignVideoScript(videoScript, audioFile);
    job.data.videoScript = videoScript;
    let lastVideoScriptItem = videoScript[videoScript.length - 1];
    let lastVideoScriptItemEnd = lastVideoScriptItem.end;
    let lastVideoScriptItemStart = lastVideoScriptItem.start;
    if (typeof lastVideoScriptItemStart === 'undefined' || typeof lastVideoScriptItemEnd === 'undefined') {
        console.log('lastVideoScriptItem', lastVideoScriptItem.aligned);
        throw new Error('lastVideoScriptItemStart or lastVideoScriptItemEnd is undefined');
    }

    if (lastVideoScriptItemStart === lastVideoScriptItemEnd) {
        throw new Error('lastVideoScriptItemStart === lastVideoScriptItemEnd ' + lastVideoScriptItemStart + ' === ' + lastVideoScriptItemEnd + ' , segment index: ' + (videoScript.length - 1));
    } else {
        console.log('All aligned');
        console.log('videoScript', videoScript.map(x => {
            return x.aligned.map(x => x.text).join('');
        }).join('\n'.repeat(5)))
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

module.exports = checkAligned;
