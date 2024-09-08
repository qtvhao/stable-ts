let getCorrectedVideoScriptItems = require('./getCorrectedVideoScriptItems.js');
let path = require('path');
let testdataDir = path.join(__dirname, '..', 'testdata', 'corrected');
let testDataProviders = [
    "100.json",
];

testDataProviders.forEach(testDataProvider => {
    test('getCorrectedVideoScriptItems ' + testDataProvider, async () => {
        let jobFilePath = path.join(testdataDir, testDataProvider);
        let job = require(jobFilePath);
        let videoScript = job.data.videoScript;
        let audioFile = job.data.audioFile;
        audioFile = audioFile.replace('/app/storage/audio/', '/samba-claim0-apis-production/gen-audio-worker-storage/');
        let correctedVideoScriptItems = await getCorrectedVideoScriptItems(videoScript, audioFile);
        // console.log(JSON.stringify(correctedVideoScriptItems, null, 2));
    });
});

