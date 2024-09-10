async function waitQueueToHaveWaitingCount(queue, waitingCount, job) {
    if (0 === waitingCount) {
        waitingCount = 2;
    }
    let jobCounts = await queue.getJobCounts();
    while (jobCounts.waiting > waitingCount) {
        let msg1 = "There are still " + jobCounts.waiting + " jobs in the queue " + queue.name + " waiting for processing";
        let msg2 = "Waiting for " + (jobCounts.waiting - waitingCount) + " jobs to be processed";
        console.log(msg1);
        console.log(msg2);
        if (job) {
            await job.log(msg1);
            await job.log(msg2);
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        jobCounts = await queue.getJobCounts();
    }
}

module.exports = waitQueueToHaveWaitingCount;
