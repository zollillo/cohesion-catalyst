
if (Meteor.isClient) {
  // We create a global client side logger object.
  // Approach borrowed from [as of 2016-02-09]:
  // https://www.loggly.com/blog/managing-a-meteor-application-in-production-three-real-log-management-use-cases/
  clientLogger =  {};

  // We define a client side log function which we use to call a Meteor method on the server.
  clientLogger.logInfo = function(message, data) {
    Meteor.call("clientLog", message, data);
  };
} // Meteor.isClient



if (Meteor.isServer) {

  var fse = Meteor.npmRequire("fs-extra");
  var logDirectory = "/tmp/ccat-log";

  fse.ensureDirSync(logDirectory);
  // if (!fse.statSync(logDirectory).isDirectory()) {
  //   fse.mkdirSync(logDirectory);
  // }

  // We create a global server logger.
  // cf. [as of 2016-02-05] https://meteorhacks.com/logging-support-for-meteor.html
  // cf. [as of 2016-02-05] https://atmospherejs.com/meteorhacks/npm
  logger = Meteor.npmRequire("winston");

  // We get the current date and time using 'Moment.js' and set the desired format
  // we want to use in our timestamp.
  var time = moment().format("YYYY-MM-DDTHH:mm:ss");

  // We prevent the Winston logger from exiting after logging an uncaughtException.
  logger.exitOnError = false;

  logger.handleExceptions(new logger.transports.File({
    filename: logDirectory + "/ccat_exception.log",
    humanReadableUnhandledException: true
    })
  );

  logger.add(logger.transports.File, {
    level: "info",
    filename: logDirectory + "/ccat_info.log",
    json: false,
    timestamp: function(){
      return time;
    },
    formatter: function(options) {
      // Return string will be passed to logger.
        return options.timestamp() + " " + options.level.toUpperCase() + " " +
          (undefined !== options.message ? options.message : "") +
          (options.meta && Object.keys(options.meta).length ?  " " + JSON.stringify(options.meta) : "");
    }
  });

  // We add the MongoDB transport, so that we can store logs to a collection
  // in our database (in addition to the 'File' core transport which lets us write
  // the logs to a log file).
  // cf. https://github.com/winstonjs/winston/blob/master/docs/transports.md#mongodb-transport
  // cf. https://github.com/winstonjs/winston-mongodb#usage
  var MongoDB = Meteor.npmRequire("winston-mongodb").MongoDB;

  logger.add(MongoDB, {
    db: process.env.MONGO_URL,
    capped: true,
    collection: "winstonLogs",
    handleExceptions: true,
    humanReadableUnhandledException: true,
    name: 'mongo.mainLogs'
  });


  // We create a method that can be called from the client side in order to
  // send a log from the client to the server.
  Meteor.methods({
    clientLog: function(message, data) {
      logger.info(message, data);
    }
  });
} // Meteor.isServer