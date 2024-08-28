let Queue = require('bull');
let child_process = require('child_process');
let fs = require('fs');
let removeMd = require('remove-markdown');

console.log('='.repeat(350));
let queueInName = process.env.QUEUE_IN_NAME;
let queueOutName = process.env.QUEUE_OUT_NAME;
let {getAlignedSubtitle} = require('./getAlignedSubtitle.js');

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
    
    let opts = {
        redis: {
            host: redisHost,
            password
        },
    };
    let queueIn = new Queue(queueInName, opts);
    let queueOut = new Queue(queueOutName, opts);
    queueIn.process(async job => {
        let alignedSubtitle;
        let jobData = job.data;
        let videoScript = jobData.videoScript;
        let audioFile = jobData.audioFile;
        let texts = videoScript.map(x => removeMd(x.text));
        let joinedText = texts.join('.\n');

        // 
        let djb2_id = djb2(joinedText);
        let alignFile = `/tmp/align-${djb2_id}.txt`;
        let outputFile = `/tmp/output-${djb2_id}.json`;
        let model = 'tiny';
        let language = 'vi';
        //
        fs.writeFileSync(alignFile, joinedText);
        // child_process.execFileSync('stable-ts', ['in.wav', '--model', model, '--language', language, '--align', alignFile, '--overwrite', '--output', outputFile]);
        let executedFileSync = child_process.execFileSync('stable-ts', [
            audioFile, 
            '--model', model, 
            '--language', language, 
            '--align', alignFile, 
            '--overwrite', 
            '--output', outputFile
        ]);
        console.log('executedFileSync', executedFileSync.toString());
        job.log('executedFileSync', executedFileSync.toString());
        
        // stable-ts in.wav --model tiny --language vi --align all.txt --overwrite --output ni.json
        let outputFileContent = fs.readFileSync(outputFile, 'utf8');
        alignedSubtitle = JSON.parse(outputFileContent);
        let aligned = getAlignedSubtitle(job, alignedSubtitle);
        await queueOut.add({
            ...jobData,
            videoScript: aligned,
        });

        return aligned;
    });
} else {
    let alignedSubtitle = require('./ni.json');
    let audio = require('./audio.json');
    getAlignedSubtitle(audio, alignedSubtitle);
}
