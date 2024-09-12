let getCheckedAlignedVideoScript = require('./getCheckedAlignedVideoScript.js');
let removeSpecialCharacters = require('./removeSpecialCharacters.js');
let testDataProviders = [
    "1.json",
    // "2.json",
    // "3.json",
    // "4.json",
    // "5.json",
    // "6.json",
    // "7.json",
    // "8.json",
    // "9.json",
    // "10.json",
]

function checkStartTimesAndEndTimes(startTimes, endTimes) {
    let sortedStartTimes = startTimes.slice().sort((a, b) => a - b);
    let sortedEndTimes = endTimes.slice().sort((a, b) => a - b);
    // 
    expect(startTimes).toEqual(sortedStartTimes);
    expect(endTimes).toEqual(sortedEndTimes);
    // console.log('startTimes', startTimes);
    // console.log('endTimes', endTimes);
}

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
            let text = removeSpecialCharacters(videoScript[i].text).trim();
            let firstSegment = aligned[0];
            let lastSegment = aligned.slice(-1)[0];
            // 
            let firstSegment_5Words = firstSegment.words.slice(0, 5).map(x => x.word).join('').trim();
            let lastSegment_5Words = lastSegment.words.slice(-5).map(x => x.word).join('').trim().replace(/\.$/, ' ').trim();
            let alignedWords = aligned.map(x => x.text).join(' ').trim();
            // 
            // console.log('='.repeat(10), alignedWords, '='.repeat(10), firstSegment_5Words, '='.repeat(10), text, '='.repeat(10), lastSegment_5Words);
            expect(firstSegment_5Words).toBe(text.slice(0, firstSegment_5Words.length).trim());
            expect(lastSegment_5Words).toBe(text.slice(-lastSegment_5Words.length).trim());
            // 
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
        let endTimes = videoScript.map(x => x.aligned.slice(-1)[0].words.slice(-1)[0].end);
        let startTimes = videoScript.map(x => x.aligned[0].words[0].start);
        checkStartTimesAndEndTimes(startTimes, endTimes);
        endTimes = videoScript.map(x => x.end);
        startTimes = videoScript.map(x => x.start);
        checkStartTimesAndEndTimes(startTimes, endTimes);
    }, 300_000);
});
