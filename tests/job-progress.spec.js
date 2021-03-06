const test = require('tape')
const Promise = require('bluebird')
const datetime = require('../src/datetime')
const is = require('../src/is')
const tError = require('./test-error')
const enums = require('../src/enums')
const jobProgress = require('../src/job-progress')
const Queue = require('../src/queue')
const tOpts = require('./test-options')

module.exports = function () {
  return new Promise((resolve, reject) => {
    test('job-progress', (t) => {
      t.plan(23)

      const q = new Queue(tOpts.cxn(), tOpts.default())
      const job = q.createJob()
      job.timeout = enums.options.timeout
      job.retryDelay = enums.options.retryDelay
      job.retryCount = 0

      let testEvents = false
      function progressEventHandler (jobId, percent) {
        if (testEvents) {
          t.equal(jobId, job.id, `Event: Job progress [${percent}]`)
        }
      }
      function addEventHandlers () {
        testEvents = true
        q.on(enums.status.progress, progressEventHandler)
      }
      function removeEventHandlers () {
        testEvents = false
        q.removeListener(enums.status.progress, progressEventHandler)
      }

      let tempDateEnable = job.dateEnable
      return q.addJob(job).then((savedJob) => {
        t.equal(savedJob[0].id, job.id, 'Job saved successfully')
        addEventHandlers()
        savedJob[0].retryCount = 1
        savedJob[0].status = enums.status.active
        return jobProgress(savedJob[0])
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return job.q.r.db(job.q.db).table(job.q.name).get(job.id).update({
          retryCount: 1
        }).run()
      }).then(() => {
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 0, 'Job progress is 0 when updated with a null value')
        t.ok(
          is.dateBetween(updatedJob[0].dateEnable,
            tempDateEnable,
            datetime.add.ms(new Date(), updatedJob[0].timeout + 2000)),
          'Job dateEnable updated successfully'
        )
        updatedJob[0].status = enums.status.active
        return jobProgress(updatedJob[0], -10)
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 0, 'Job progress is 0 when updated with negative value')
        t.ok(
          is.dateBetween(updatedJob[0].dateEnable,
            tempDateEnable,
            datetime.add.ms(new Date(), updatedJob[0].timeout + 2000 + updatedJob[0].retryDelay)),
          'Job dateEnable updated successfully'
        )
        updatedJob[0].status = enums.status.active
        return jobProgress(updatedJob[0], 1)
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 1, 'Job progress is 1 percent')
        updatedJob[0].status = enums.status.active
        return jobProgress(updatedJob[0], 50)
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 50, 'Job progress is 50 percent')
        updatedJob[0].status = enums.status.active
        return jobProgress(updatedJob[0], 100)
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 100, 'Job progress is 100 percent')
        updatedJob[0].status = enums.status.active
        return jobProgress(updatedJob[0], 101)
      }).then((updatedJob) => {
        t.ok(updatedJob, 'Job updated successfully')
        return q.getJob(job.id)
      }).then((updatedJob) => {
        t.equal(updatedJob[0].progress, 100, 'Job progress is 100 when updated with larger value')
        updatedJob[0].status = enums.status.failed
        return jobProgress(updatedJob[0], 101)
      }).then((inactiveResult) => {
        t.notOk(inactiveResult, 'Inactive job returns false')

        removeEventHandlers()
        return q.reset()
      }).then((resetResult) => {
        t.ok(resetResult >= 0, 'Queue reset')
        q.stop()
        return resolve(t.end())
      }).catch(err => tError(err, module, t))
    })
  })
}
