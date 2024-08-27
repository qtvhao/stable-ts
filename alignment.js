var levenshtein = require('fast-levenshtein');
let removeMd = require('remove-markdown');
let Queue = require('bull');
let child_process = require('child_process');
let fs = require('fs');

console.log('='.repeat(350));
let queueInName = process.env.QUEUE_IN_NAME;
let queueOutName = process.env.QUEUE_OUT_NAME;

function getAlignedSubtitle(audio, alignedSubtitle) {
    let videoScript = audio.data.videoScript;
    let segments = alignedSubtitle.segments;
    let currentSegment = 0;
    videoScript = videoScript.map(x => {
        x.translated = removeMd(x.text);
        return x;
    });
    for (let i = 0; i < videoScript.length; i++) {
        let translated = videoScript[i].translated;
        // find the segment that contains the translated text, use levenshtein to find the best match
        // lower the distance, the better match
        let bestMatch = 100000;
        // let bestMatchIndex = 0;
        // let segmentsFromCurrent // this is the text from the current segment to the best match segment
        let aligned
        let last200
        let alignedAt

        for (let j = currentSegment; j < segments.length; j++) {
            let segmentsFromCurrent = segments.slice(currentSegment, j);
            let segmentsFromCurrentText = segmentsFromCurrent.map(x => x.text).join('');
            let translatedLast200 = translated.slice(-200);
            let segmentsFromCurrentLast200 = segmentsFromCurrentText.slice(-200);
            // console.log('segmentsFromCurrentLast200', segmentsFromCurrentLast200);
            let distance = levenshtein.get(translatedLast200, segmentsFromCurrentLast200);
            // console.log('distance', distance);
            // console.log('segmentsFromCurrent', segmentsFromCurrent);
            if (distance < bestMatch) {
                bestMatch = distance;
                alignedAt = j;
                aligned = segmentsFromCurrent;
                last200 = segmentsFromCurrentLast200;
            } else {
                // break;
            }
        }
        aligned = aligned.map(x => {
            return {
                start: x.start,
                end: x.end,
                text: x.text,
                words: x.words.map(y => {
                    return {
                        word: y.word,
                        start: y.start,
                        end: y.end,
                    };
                }),
            };
        });
        currentSegment = alignedAt;
        videoScript[i].aligned = aligned;
        videoScript[i].segmentsFromCurrentLast200 = last200;
        // console.log('bestMatch', bestMatch);
        // console.log('-'.repeat(100));
        // console.log('aligned', aligned);
        // console.log('-'.repeat(100));
        // console.log('bestMatchIndex', bestMatchIndex);
        // console.log('segmentsFromCurrent', segmentsFromCurrent);
        // console.log('translated', translated);
        // break;
    }
    // console.log(videoScript);

    return videoScript;
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
        let texts = videoScript.map(x => x.text);
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
