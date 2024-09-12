let removeSpecialCharacters = require('./removeSpecialCharacters.js');
let getCorrectedVideoScriptItems = require('./getCorrectedVideoScriptItems.js');
let path = require('path');
let testdataDir = path.join(__dirname, '..', 'testdata', 'corrected');
let testDataProviders = [
    "2.json",
    // "100.json",
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
            // let text = correctedVideoScriptItem.text;
            let aligned = correctedVideoScriptItem.aligned;
            // console.log(JSON.stringify(correctedVideoScriptItem, null, 2));
            let text = removeSpecialCharacters(videoScript[i].text).trim();
            let firstSegment = aligned[0];
            let lastSegment = aligned.slice(-1)[0];
            // 
            let firstSegment_5Words = firstSegment.words.slice(0, 5).map(x => x.word).join('').trim();
            let lastSegment_5Words = lastSegment.words.slice(-5).map(x => x.word).join('').trim();
            let alignedWords = aligned.map(x => x.text).join(' ').trim();
            // 
            console.log('='.repeat(10), alignedWords, '='.repeat(10), firstSegment_5Words, '='.repeat(10), text, '='.repeat(10), lastSegment_5Words);
            expect(firstSegment_5Words).toBe(text.slice(0, firstSegment_5Words.length).trim());
            expect(lastSegment_5Words).toBe(text.slice(-lastSegment_5Words.length).trim());

        }
    });
});

