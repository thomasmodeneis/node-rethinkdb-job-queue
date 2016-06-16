const logger = require('./logger')(module)
const Promise = require('bluebird')
const enums = require('./enums')
const dbReview = require('./db-review')
const queueDb = require('./queue-db')

module.exports = function queueStop (q, stopTimeout, drainPool = true) {
  logger('queueStop')
  q.emit(enums.queueStatus.stopping)
  q.paused = true
  let stopIntervalId
  let stopTimeoutId
  const cleanUp = (drainPoolNow) => {
    return queueDb.detach(q, drainPoolNow).then(() => {
      if (stopIntervalId) { clearInterval(stopIntervalId) }
      if (stopTimeoutId) { clearTimeout(stopTimeoutId) }
    })
  }

  logger('Waiting half stop time')
  return Promise.delay(stopTimeout / 2)
  .then(() => {
    return new Promise((resolve) => {
      stopTimeoutId = setTimeout(() => {
        logger('Queue stopped forcefully: ', drainPool)
        console.log('Queue stopped forcefully: ', drainPool)
        return cleanUp(drainPool).then(() => {
          q.emit(enums.queueStatus.stopped)
          q.running < 1 ? resolve(enums.message.allJobsStopped)
            : resolve(enums.message.failedToStop)
        })
      }, stopTimeout / 2)

      stopIntervalId = setInterval(() => {
        if (q.running < 1) {
          logger('Queue stopped gracefully: ', drainPool)
          console.log('Queue stopped gracefully: ', drainPool)
          return cleanUp(drainPool).then(() => {
            q.emit(enums.queueStatus.stopped)
            resolve(enums.message.allJobsStopped)
          })
        }
      }, stopTimeout / 12)

      return queueDb.detach(q, false) // TODO:
    })
  })
}
