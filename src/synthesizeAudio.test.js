let synthesizeAudio = require('./synthesizeAudio.js');
let path = require('path');
let testdataDir = path.join(__dirname, '..', 'testdata');
let synthesizeDir = path.join(testdataDir, 'synthesize');
let testDataProviders = [
    "1.json",
];

testDataProviders.forEach(testDataProvider => {
    test('synthesizeAudio ' + testDataProvider, async () => {
        let jobFilePath = path.join(synthesizeDir, testDataProvider);
        let job = require(jobFilePath);
        let videoScript = job.data.videoScript;
        let audioFilePath = job.data.audioFile;
        let segments = await synthesizeAudio(audioFilePath, videoScript);
        console.log(segments);
    });
});
