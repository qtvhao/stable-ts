let fs = require('fs');
let path = require('path');
let Queue = require('bull');
let waitQueueToHaveWaitingCount = require('./src/waitQueueToHaveWaitingCount.js');
let getCheckedAlignedVideoScript = require('./src/getCheckedAlignedVideoScript.js');
let password = process.env.REDIS_PASSWORD
let redisHost = process.env.REDIS_HOST || 'redis'
let queueOutName = process.env.QUEUE_OUT_NAME;
const http = require('http');

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

let alignOutput = '/align-output';
(async function(){
    let touched = '/app/storage/audio/touched';
    let touched2 = '/align-output/touched';
    while(true) {
        try {
            fs.writeFileSync(touched, 'touched');
            fs.writeFileSync(touched2, 'touched');
            break;
        }catch(e) {
            console.error(e);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.error(e);
        }
    }
    queueInBackup.process(async (job) => {
        await waitQueueToHaveWaitingCount(queueOut, 0, job);
        await fetch('http://distributor-api:80/', { method: 'POST', headers: {'Content-Type': 'application/json',}, body: JSON.stringify({ 'status': 'step_2.1', 'prompt': job.data.article.name, 'secret_key': job.data.secret_key,}),});
        let jobData = job.data;
        let audioFile = jobData.audioFile;
        let tmpAudioFile = '/tmp/' + path.basename(audioFile);
        fs.copyFileSync(audioFile, tmpAudioFile);
        let alignOutputFile = path.join(alignOutput, path.basename(audioFile) + '.json');
        let aligned;
        if (fs.existsSync(alignOutputFile)) {
            aligned = JSON.parse(fs.readFileSync(alignOutputFile, 'utf8'));
        }else{
            try {
                aligned = await getCheckedAlignedVideoScript(job, tmpAudioFile)
            } catch (error) {
                try{
                    http.request({
                        host: 'distributor-api',
                        port: 80,
                        path: '/',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }, function(res) {}).end(JSON.stringify({
                        'status': 'step_2.1.there_is_some_error',
                        'prompt': job.data.article.name,
                        'secret_key': job.data.secret_key,
                    }));
                    // await fetch('http://distributor-api:80/', { method: 'POST', headers: {'Content-Type': 'application/json',}, body: JSON.stringify({ 'status': 'step_2.1.there_is_some_error', 'prompt': job.data.article.name, 'secret_key': job.data.secret_key,}),});
                }catch(e) {
                    console.error(e);
                }
                throw error;
            }
            fs.writeFileSync(alignOutputFile, JSON.stringify(aligned, null, 4));
        }
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
})();
