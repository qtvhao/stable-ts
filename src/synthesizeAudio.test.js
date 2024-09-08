let synthesizeAudio = require('./synthesizeAudio.js');
let path = require('path');
let testdataDir = path.join(__dirname, '..', 'testdata');
let synthesizeDir = path.join(testdataDir, 'synthesize');
let testDataProviders = [
    "1.json",
];
let child_process = require('child_process');

testDataProviders.forEach(testDataProvider => {
    test('synthesizeAudio ' + testDataProvider, async () => {
        let jobFilePath = path.join(synthesizeDir, testDataProvider);
        console.log(jobFilePath);
        let job = require(jobFilePath);
        let videoScript = job.data.videoScript;
        let audioFilePath = job.data.audioFile;
        audioFilePath = audioFilePath.replace('/app/storage/audio/', '/samba-claim0-apis-production/gen-audio-worker-storage/');
        let audioMp3Path = audioFilePath.replace('.aac', '.mp3');
        child_process.execSync('ffmpeg -y -i ' + audioFilePath + ' ' + audioMp3Path);
        let segments = await synthesizeAudio(audioMp3Path, videoScript);
        console.log(segments);
        let expectedTheLastSegments = job.expectedTheLastSegments;
        let theLastSegments = segments.slice(-expectedTheLastSegments.length);
        console.log(JSON.stringify(theLastSegments, null, 2));
        expect(theLastSegments).toEqual(expectedTheLastSegments);
    });
});
