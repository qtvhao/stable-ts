let getCheckedAlignedVideoScript = require('./getCheckedAlignedVideoScript.js');
let testDataProviders = [
    "1.json",
    "2.json",
    // "3.json",
    // "4.json",
    // "5.json",
    // "6.json",
    // "7.json",
    // "8.json",
    // "9.json",
    // "10.json",
]

testDataProviders.forEach(testDataProvider => {
    test(`getCheckedAlignedVideoScript ${testDataProvider}`, async () => {
        let job = require(`../testdata/${testDataProvider}`);
        let audioFile = job.data.audioFile;
        audioFile = audioFile.replace('/app/storage/audio/', '/samba-claim0-apis-production/gen-audio-worker-storage/');
        let videoScript = await getCheckedAlignedVideoScript(job, audioFile)
        expect(videoScript).toBeDefined();
        expect(videoScript.length).toBeGreaterThan(0);
        expect(videoScript.length).toBe(job.data.videoScript.length);
        // console.log('videoScript', videoScript);
    }, 300_000);
});
