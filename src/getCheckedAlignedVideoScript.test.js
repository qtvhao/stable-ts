let getCheckedAlignedVideoScript = require('./getCheckedAlignedVideoScript.js');
test('getCheckedAlignedVideoScript', async () => {
    let job = {
        data: {
            videoScript: []
        }
    }
    let audioFile = 'test/audio.aac';
    let aligned = await getCheckedAlignedVideoScript(job, audioFile)
    console.log('aligned', aligned);
});
