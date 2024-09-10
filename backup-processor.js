let fs = require('fs');
let path = require('path');
let Queue = require('bull');
let waitQueueToHaveWaitingCount = require('./src/waitQueueToHaveWaitingCount.js');
let getCheckedAlignedVideoScript = require('./src/getCheckedAlignedVideoScript.js');
let password = process.env.REDIS_PASSWORD
let redisHost = process.env.REDIS_HOST || 'redis'
let queueOutName = process.env.QUEUE_OUT_NAME;

let lockDuration = 20 * 60 * 1000; // 20 minutes
let opts = {
    redis: {
        host: redisHost,
        password
    },
    settings: {
        lockDuration,
        stalledInterval: 0,
    },
};
let queueInBackup = new Queue('stable-ts-backup', opts);
let queueOut = new Queue(queueOutName, opts);

queueInBackup.process(async (job) => {
    await waitQueueToHaveWaitingCount(queueOut, 0, job);
    let jobData = job.data;
    let audioFile = jobData.audioFile;
    let tmpAudioFile = '/tmp/' + path.basename(audioFile);
    fs.copyFileSync(audioFile, tmpAudioFile);
    let aligned = await getCheckedAlignedVideoScript(job, tmpAudioFile)
    await queueOut.add({
        ...jobData,
        videoScript: aligned,
    });

    fs.unlinkSync(tmpAudioFile);

    return {
        success: true,
        message: 'Backup processed successfully',
    };
});
