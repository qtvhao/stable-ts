let getCorrectedVideoScriptItems = require('./getCorrectedVideoScriptItems.js');
let path = require('path');
let testdataDir = path.join(__dirname, '..', 'testdata', 'corrected');
let testDataProviders = [
    "2.json",
    "100.json",
];
let fs = require('fs');
let convertAudioFileMp3 = require('./convertAudioFileMp3.js')

testDataProviders.forEach(testDataProvider => {
    test('getCorrectedVideoScriptItems ' + testDataProvider, async () => {
        let jobFilePath = path.join(testdataDir, testDataProvider);
        let job = require(jobFilePath);
        let videoScript = job.data.videoScript;
        let audioFile = job.data.audioFile;
        audioFile = audioFile.replace('/app/storage/audio/', '/samba-claim0-apis-production/gen-audio-worker-storage/');
        audioFile = convertAudioFileMp3(audioFile);
        let copyTo = path.join(__dirname, 'copied.mp3');
        fs.copyFileSync(audioFile, copyTo);
        let {correctedVideoScriptItems} = await getCorrectedVideoScriptItems(videoScript, copyTo);
        for (let i = 0; i < correctedVideoScriptItems.length; i++) {
            let correctedVideoScriptItem = correctedVideoScriptItems[i];
            let text = correctedVideoScriptItem.text;
            let aligned = correctedVideoScriptItem.aligned;
            console.log(JSON.stringify(correctedVideoScriptItems[i], null, 2));
        }
    });
});

