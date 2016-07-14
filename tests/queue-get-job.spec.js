const test = require('tape')
const Promise = require('bluebird')
const moment = require('moment')
const is = require('../src/is')
const enums = require('../src/enums')
const testError = require('./test-error')
const testQueue = require('./test-queue')
const queueGetJob = require('../src/queue-get-job')
const testData = require('./test-options').testData

module.exports = function () {
  return new Promise((resolve, reject) => {
    test('queue-get-job', (t) => {
      t.plan(13)

      const q = testQueue()
      const job1 = q.createJob(testData)
      const job2 = q.createJob(testData)
      const job3 = q.createJob(testData)
      const jobs = [
        job1,
        job2,
        job3
      ]
      let jobsSaved

      return q.reset().then((resetResult) => {
        t.ok(is.integer(resetResult), 'Queue reset')
        return q.addJob(jobs)
      }).then((savedJobs) => {
        jobsSaved = savedJobs
        t.equal(savedJobs.length, 3, 'Job saved successfully')

        // ---------- Undefined Tests ----------
        t.comment('queue-get-job: Undefined Job')
        return queueGetJob(q)
      }).then((undefinedResult) => {
        t.ok(is.array(undefinedResult), 'Undefined returns an Array')
        t.equal(undefinedResult.length, 0, 'Undefined returns an empty Array')

        // ---------- Invalid Id Tests ----------
        t.comment('queue-get-job: Invalid Id')
        return queueGetJob(q, ['invalid id']).catch((err) => {
          t.ok(err.message.includes(enums.message.idInvalid), 'Invalid id returns rejected Promise')
        })
      }).then((empty) => {
        //
        // ---------- Empty Array Tests ----------
        t.comment('queue-get-job: Empty Array')
        return queueGetJob(q, [])
      }).then((empty) => {
        t.equal(empty.length, 0, 'Empty array returns empty array')

        // ---------- Single Id Tests ----------
        t.comment('queue-get-job: Single Id')
        return queueGetJob(q, job1.id)
      }).then((retrievedJob) => {
        t.equal(retrievedJob.length, 1, 'One jobs retrieved')
        t.deepEqual(retrievedJob[0], jobsSaved[0], 'Job retrieved successfully')

        // ---------- Id Array Tests ----------
        t.comment('queue-get-job: Array of Ids')
        return queueGetJob(q, [job1.id, job2.id, job3.id])
      }).then((retrievedJobs) => {
        const retrievedIds = retrievedJobs.map(j => j.id)
        t.equal(retrievedJobs.length, 3, 'Three jobs retrieved')
        t.ok(retrievedIds.includes(retrievedJobs[0].id), 'Job 1 retrieved successfully')
        t.ok(retrievedIds.includes(retrievedJobs[1].id), 'Job 2 retrieved successfully')
        t.ok(retrievedIds.includes(retrievedJobs[2].id), 'Job 3 retrieved successfully')
        return q.reset()
      }).then((resetResult) => {
        t.ok(resetResult >= 0, 'Queue reset')
        resolve()
      }).catch(err => testError(err, module, t))
    })
  })
}
