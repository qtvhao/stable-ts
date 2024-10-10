let Queue = require('bull');
let child_process = require('child_process');
let fs = require('fs');
let removeMd = require('remove-markdown');

console.log('='.repeat(350));
let queueInName = process.env.QUEUE_IN_NAME;
let queueOutName = process.env.QUEUE_OUT_NAME;
let {getAlignedSubtitle} = require('./getAlignedSubtitle.js');
let waitQueueToHaveWaitingCount = require('./src/waitQueueToHaveWaitingCount.js');
const path = require('path');
function removePunctuation(text) {
    return text.replace(/[-,\?,\!,\:,\;,\n*]/g, ' ').replace(/\s+/g, ' ');
}

function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash;
}
if (typeof queueInName !== 'undefined') {
    console.log('queueName', queueInName);
    let password = process.env.REDIS_PASSWORD
    let redisHost = process.env.REDIS_HOST || 'redis'
    
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
    let queueIn = new Queue(queueInName, opts);
    let queueOut = new Queue(queueOutName, opts);
    let model = process.env.STABLE_TS_MODEL;
    let language = process.env.STABLE_TS_LANGUAGE;
    queueIn.process(async job => {
        await waitQueueToHaveWaitingCount(queueOut, 0, job);
        await fetch('http://distributor-api:80/', { method: 'POST', headers: {'Content-Type': 'application/json',}, body: JSON.stringify({ 'status': 'step_2.1', 'prompt': job.data.article.name, 'secret_key': job.data.secret_key,}),});
        let queueOutJobCounts = await queueOut.getJobCounts();
        while (queueOutJobCounts.waiting > 10) {
            console.log('queueOut is busy, wait 10 seconds');
            await new Promise(resolve => setTimeout(resolve, 10_000));
            queueOutJobCounts = await queueOut.getJobCounts();
        }
        let alignedSubtitle;
        let jobData = JSON.parse(JSON.stringify(job.data));
        let videoScript = jobData.videoScript;
        let audioFile = jobData.audioFile;
        let texts = videoScript.map(x => removeMd(x.text));
        let joinedText = texts.join('.\n');
        joinedText = removePunctuation(joinedText);

        // 
        let djb2_id = djb2(joinedText);
        let alignFile = `/tmp/align-${djb2_id}.txt`;
        let outputFile = `/align-output/output-x2-${djb2_id}.json`;
        fs.writeFileSync(alignFile, joinedText);

        job.log('outputFile: ' + outputFile);
        if (fs.existsSync(outputFile)) {
            console.log('outputFile already exists', outputFile);
            job.log('outputFile already exists: ' + outputFile);
        }else{
            let tmpAudioFile = '/tmp/' + path.basename(audioFile);
            fs.copyFileSync(audioFile, tmpAudioFile);
            await new Promise(function(resolve, reject){
                let child = child_process.execFile('stable-ts', [
                    tmpAudioFile, 
                    '--model', model, 
                    '--language', language, 
                    '--align', alignFile, 
                    '--overwrite',
                    '--output', outputFile
                ]);
                child.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error('stable-ts exited with code ' + code));
                    }
                });
                child.on('error', (err) => {
                    reject(err);
                });
                child.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error('stable-ts exited with code ' + code));
                    }
                });
                child.stdout.on('data', (data) => {
                    console.log('stable-ts stdout:', data.toString());
                    job.log('stable-ts stdout:' + data.toString());
                });
                child.stderr.on('data', (data) => {
                    console.error('stable-ts stderr:', data.toString());
                    job.log('stable-ts stderr:' + data.toString());
                    // 
                    // find percentage
                    let percentage = data.toString().match(/(\d+)%/);
                    if (percentage) {
                        let percentageValue = parseFloat(percentage[1]);
                        job.progress(percentageValue);
                    }
                });
            }); 
            // console.log('executedFileSync', executedFileSync.toString());
            // job.log('executedFileSync:' + executedFileSync.toString());
        }
        
        // stable-ts in.wav --model tiny --language vi --align all.txt --overwrite --output ni.json
        let outputFileContent = fs.readFileSync(outputFile, 'utf8');
        alignedSubtitle = JSON.parse(outputFileContent);
        let aligned
        try {
            aligned = getAlignedSubtitle(job, alignedSubtitle);
        } catch(e) {
            console.log('error', e);
            await queueInBackup.add(jobData);
            throw e;
            // let tmpAudioFile = '/tmp/' + path.basename(audioFile);
            // fs.copyFileSync(audioFile, tmpAudioFile);
            // aligned = await getCheckedAlignedVideoScript(job, tmpAudioFile)
        }
        await queueOut.add({
            ...jobData,
            initiator: process.argv[1],
            videoScript: aligned,
        });

        return aligned;
    });
} else {
    let alignedSubtitle = require('./ni.json');
    let audio = require('./audio.json');
    getAlignedSubtitle(audio, alignedSubtitle);
}
