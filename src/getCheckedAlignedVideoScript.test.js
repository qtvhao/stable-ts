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
        for (let i = 0; i < videoScript.length; i++) {
            let aligned = videoScript[i].aligned;
            for (let j = 0; j < aligned.length; j++) {
                let words = aligned[j].words;
                expect(words).toBeDefined();
                expect(words.length).toBeGreaterThan(0);
                for (let k = 0; k < words.length; k++) {
                    let word = words[k];
                    expect(word.start).toBeDefined();
                    expect(word.end).toBeDefined();
                    expect(word.word).toBeDefined();
                }
            }
        }
    }, 300_000);
});
